param([Parameter(Mandatory=$true)][string]$InputBase64)
$ErrorActionPreference = "Stop"
$utf8 = New-Object Text.UTF8Encoding $false
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$inputJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($InputBase64))
$command = $inputJson | ConvertFrom-Json
$excel = $null
$createdExcel = $false
$openedWorkbook = $false
$workbook = $null
$sheet = $null
$previousDisplayAlerts = $null
$previousAskToUpdateLinks = $null
$previousAutomationSecurity = $null
$previousEnableEvents = $null

function Result($value) { $value | ConvertTo-Json -Depth 20 -Compress }
function ExcelInstalled { try { return $null -ne [type]::GetTypeFromProgID("Excel.Application") } catch { return $false } }
function FileHash([string]$file) {
  foreach ($attempt in 1..25) {
    $stream = $null
    $algorithm = $null
    try {
      $share = [IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete
      $stream = [IO.File]::Open($file, [IO.FileMode]::Open, [IO.FileAccess]::Read, $share)
      $algorithm = [Security.Cryptography.SHA256]::Create()
      return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace("-", "")
    }
    catch {
      if ($attempt -eq 25) { throw }
      Start-Sleep -Milliseconds 200
    }
    finally {
      if ($null -ne $algorithm) { $algorithm.Dispose() }
      if ($null -ne $stream) { $stream.Dispose() }
    }
  }
}
function ValuesEqual($left, $right) {
  if ($null -eq $left -and $null -eq $right) { return $true }
  if ($null -eq $left -or $null -eq $right) { return ([string]$left -eq [string]$right) }
  if ($left -is [ValueType] -and $right -is [ValueType]) { return [Math]::Abs(([double]$left) - ([double]$right)) -lt 0.000000001 }
  return [string]$left -eq [string]$right
}
function EnsureExclusiveAccess([string]$file) {
  try {
    $stream = [IO.File]::Open($file, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
    $stream.Close()
  } catch { throw "FILE_LOCKED:$file|$($_.Exception.Message)" }
}
function GetExcel([bool]$allowCreate) {
  try { return [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application") } catch {}
  if (!$allowCreate) { return $null }
  $script:createdExcel = $true
  $app = New-Object -ComObject Excel.Application
  $app.Visible = $false
  return $app
}
function FindOpenWorkbook($app, [string]$file) {
  $full = [IO.Path]::GetFullPath($file)
  foreach ($book in $app.Workbooks) {
    if ([IO.Path]::GetFullPath($book.FullName) -eq $full) { return $book }
  }
  return $null
}
function GetWorkbook($app, [string]$file, [bool]$readOnly) {
  $open = FindOpenWorkbook $app $file
  if ($null -ne $open) { return $open }
  $script:openedWorkbook = $true
  return $app.Workbooks.Open([IO.Path]::GetFullPath($file), 0, $readOnly)
}
function FindPilotRow($sheet, [string]$fleet, [string]$implement, [int]$headerRow) {
  $last = $sheet.Cells.Item($sheet.Rows.Count, "F").End(-4162).Row
  $rowsFound = @()
  $implementPattern = '^' + [regex]::Escape($implement) + '(?:\s|$)'
  for ($row = $headerRow + 1; $row -le $last; $row++) {
    if (([string]$sheet.Range("F$row").Text).Trim() -eq $fleet -and ([string]$sheet.Range("G$row").Text).Trim() -match $implementPattern) { $rowsFound += $row }
  }
  if ($rowsFound.Count -eq 0) { throw "PILOT_EQUIPMENT_NOT_FOUND:$fleet/$implement" }
  if ($rowsFound.Count -ne 1) { throw "AMBIGUOUS_MATCH:$fleet/$implement|$($rowsFound -join ',')" }
  return [int]$rowsFound[0]
}
function PilotCells([int]$row) {
  return [ordered]@{ status="H$row"; startDate="K$row"; startTime="L$row"; forecastDate="M$row"; forecastTime="N$row"; description="S$row" }
}
function ReadPilotValues($sheet, [int]$row) {
  $values = [ordered]@{}
  $formulas = [ordered]@{}
  $formats = [ordered]@{}
  foreach ($entry in (PilotCells $row).GetEnumerator()) {
    $cell = $sheet.Range($entry.Value)
    $values[$entry.Key] = $cell.Value2
    $formulas[$entry.Key] = $cell.Formula
    $formats[$entry.Key] = $cell.NumberFormat
  }
  return @{ values=$values; formulas=$formulas; numberFormats=$formats }
}
function EnsurePilotMergeWhitelist($sheet, [int]$row) {
  $allowed = @{}
  foreach ($address in (PilotCells $row).Values) { $allowed[$address.ToUpperInvariant()] = $true }
  foreach ($address in (PilotCells $row).Values) {
    $cell = $sheet.Range($address)
    if (!$cell.MergeCells) { continue }
    foreach ($mergedCell in $cell.MergeArea.Cells) {
      $mergedAddress = $mergedCell.Address($false, $false).ToUpperInvariant()
      if (!$allowed.ContainsKey($mergedAddress)) { throw "MERGED_CELL_OUTSIDE_WHITELIST:$address|$($cell.MergeArea.Address())" }
    }
  }
}

try {
  if ($command.type -eq "CHECK_EXCEL_INSTALLED") { Result @{installed=(ExcelInstalled);platform="win32"}; exit 0 }
  $allowCreate = $command.type -ne "LIST_OPEN_WORKBOOKS"
  $excel = GetExcel $allowCreate
  if ($null -eq $excel) { Result @{workbooks=@();connectedToUserInstance=$false}; exit 0 }

  $previousDisplayAlerts = $excel.DisplayAlerts
  $previousAskToUpdateLinks = $excel.AskToUpdateLinks
  $previousEnableEvents = $excel.EnableEvents
  try { $previousAutomationSecurity = $excel.AutomationSecurity } catch {}
  $excel.DisplayAlerts = $false
  $excel.AskToUpdateLinks = $false
  try { $excel.AutomationSecurity = 3 } catch {}

  if ($command.type -eq "LIST_OPEN_WORKBOOKS") {
    Result @{workbooks=@($excel.Workbooks | ForEach-Object {@{name=$_.Name;fullName=$_.FullName;readOnly=$_.ReadOnly;saved=$_.Saved}});connectedToUserInstance=(-not $createdExcel)}
    exit 0
  }

  if ($command.type -eq "PREPARE_OFFICIAL_PILOT") {
    $full = [IO.Path]::GetFullPath([string]$command.workbook)
    $backup = [IO.Path]::GetFullPath([string]$command.payload.backupPath)
    if (!(Test-Path -LiteralPath $full -PathType Leaf)) { throw "OFFICIAL_WORKBOOK_NOT_FOUND:$full" }
    $fileInfo = Get-Item -LiteralPath $full
    if ($fileInfo.IsReadOnly) { throw "WORKBOOK_READ_ONLY:$full" }
    EnsureExclusiveAccess $full
    $hashBefore = FileHash $full
    if (Test-Path -LiteralPath $backup) { throw "BACKUP_ALREADY_EXISTS:$backup" }
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($backup))
    [IO.File]::Copy($full, $backup, $false)
    $backupHash = FileHash $backup
    $hashAfter = FileHash $full
    if ($hashBefore -ne $backupHash -or $hashBefore -ne $hashAfter) { Remove-Item -LiteralPath $backup -Force -ErrorAction SilentlyContinue; throw "BACKUP_HASH_MISMATCH:$hashBefore|$backupHash|$hashAfter" }
    $workbook = GetWorkbook $excel $full $true
    $sheet = $workbook.Worksheets.Item([string]$command.worksheet)
    $row = FindPilotRow $sheet ([string]$command.payload.fleet) ([string]$command.payload.implement) 7
    $read = ReadPilotValues $sheet $row
    if (([string]$read.values.status).Trim().ToUpperInvariant() -ne "P") { throw "PILOT_BASELINE_STATUS_BLOCKED:H$row|$($read.values.status)" }
    $cells = PilotCells $row
    Result @{workbook=$full;worksheet=$command.worksheet;fleet=$command.payload.fleet;implement=$command.payload.implement;row=$row;cells=$cells;current=$read.values;formulas=$read.formulas;numberFormats=$read.numberFormats;originalHash=$hashBefore;backupPath=$backup;backupHash=$backupHash;sizeBytes=$fileInfo.Length;lastWriteTime=$fileInfo.LastWriteTime.ToString("o");macrosExecuted=$false;eventsChanged=$false}
    exit 0
  }

  if ($command.type -eq "ROLLBACK_OFFICIAL_PILOT") {
    $full = [IO.Path]::GetFullPath([string]$command.workbook)
    $backup = [IO.Path]::GetFullPath([string]$command.payload.backupPath)
    if (!(Test-Path -LiteralPath $backup -PathType Leaf)) { throw "BACKUP_NOT_FOUND:$backup" }
    $backupHash = FileHash $backup
    if ($backupHash -ne [string]$command.payload.backupHash) { throw "BACKUP_HASH_MISMATCH:$($command.payload.backupHash)|$backupHash" }
    if ($null -ne (FindOpenWorkbook $excel $full)) { throw "WORKBOOK_OPEN_FOR_ROLLBACK:$full" }
    EnsureExclusiveAccess $full
    $currentHash = FileHash $full
    if ($currentHash -ne [string]$command.payload.expectedCurrentHash) { throw "ROLLBACK_CONFLICT:$($command.payload.expectedCurrentHash)|$currentHash" }
    $staging = [IO.Path]::Combine([IO.Path]::GetDirectoryName($full), ".~coa-rollback-$([Guid]::NewGuid().ToString('N')).xlsm")
    try {
      [IO.File]::Copy($backup, $staging, $false)
      $stagingHash = FileHash $staging
      if ($stagingHash -ne $backupHash) { throw "BACKUP_HASH_MISMATCH:$backupHash|$stagingHash" }
      # File.Replace with a null backup path is rejected by some Windows/.NET
      # combinations ("path has invalid format"). The workbook is already
      # exclusively locked and the staged copy was hash-verified, so replace
      # it using the native file move sequence without creating a sidecar.
      Remove-Item -LiteralPath $full -Force
      Move-Item -LiteralPath $staging -Destination $full -Force
    } finally {
      if (Test-Path -LiteralPath $staging) { Remove-Item -LiteralPath $staging -Force -ErrorAction SilentlyContinue }
    }
    $restoredHash = FileHash $full
    if ($restoredHash -ne $backupHash) { throw "ROLLBACK_VERIFICATION_FAILED:$backupHash|$restoredHash" }
    $workbook = GetWorkbook $excel $full $true
    $sheet = $workbook.Worksheets.Item([string]$command.worksheet)
    $row = FindPilotRow $sheet ([string]$command.payload.fleet) ([string]$command.payload.implement) 7
    $read = ReadPilotValues $sheet $row
    Result @{restored=$true;restoredHash=$restoredHash;backupHash=$backupHash;row=$row;values=$read.values;macrosExecuted=$false;eventsChanged=$false}
    exit 0
  }

  $writeAction = @("APPLY_CHANGE", "SAVE_DEV_WORKBOOK", "APPLY_OFFICIAL_PILOT") -contains $command.type
  $interactiveLocal = $command.type -eq "OPEN_LOCAL_WORKBOOK" -or $command.type -eq "OPEN_DEV_WORKBOOK"
  # Local .dev workbooks are intentionally editable in LOCAL_OPERATIONAL.
  # Official pilot commands keep their existing read-only/write policy.
  $workbook = GetWorkbook $excel ([string]$command.workbook) ($(if ($interactiveLocal) { $false } else { -not $writeAction }))
  if ($command.type -eq "OPEN_DEV_WORKBOOK" -or $command.type -eq "OPEN_LOCAL_WORKBOOK") {
    $excel.Visible = $true
    [void]$workbook.Activate()
    try { $excel.WindowState = -4137 } catch {}
    Result @{name=$workbook.Name;fullName=$workbook.FullName;readOnly=$workbook.ReadOnly;createdExcel=$createdExcel;reused=(-not $openedWorkbook);macrosExecuted=$false;officialWorkbookTouched=$false}
    exit 0
  }
  if ($command.type -eq "LIST_WORKSHEETS") { Result @{workbook=$workbook.Name;worksheets=@($workbook.Worksheets | ForEach-Object {@{name=$_.Name;visible=$_.Visible;usedRange=$_.UsedRange.Address()}})}; exit 0 }
  $sheet = $workbook.Worksheets.Item([string]$command.worksheet)

  switch ($command.type) {
    "READ_CELL" { $cell=$sheet.Range($command.payload.cell); Result @{cell=$cell.Address($false,$false);value=$cell.Value2;formula=$cell.Formula;numberFormat=$cell.NumberFormat} }
    "READ_RANGE" { $range=$sheet.Range($command.payload.range); Result @{range=$range.Address();values=$range.Value2;formulas=$range.Formula} }
    "FIND_EQUIPMENT" {
      $column=[string]$command.payload.fleetColumn; $fleet=[string]$command.payload.fleet; $last=$sheet.Cells.Item($sheet.Rows.Count,$column).End(-4162).Row; $matches=@()
      for ($row=[int]$command.payload.headerRow+1; $row -le $last; $row++) { $cell=$sheet.Range("$column$row"); if (([string]$cell.Text).Trim() -eq $fleet) { $merged=$null; if ($cell.MergeCells) {$merged=$cell.MergeArea.Address()}; $matches+=@{row=$row;cell=$cell.Address($false,$false);value=[string]$cell.Text;mergedArea=$merged} } }
      $status=if($matches.Count-eq 0){"NOT_FOUND"}elseif($matches.Count-eq 1){"UNIQUE_MATCH"}else{"AMBIGUOUS_MATCH"}; Result @{status=$status;fleet=$fleet;candidates=$matches}
    }
    "PREVIEW_CHANGE" { $cells=@{}; foreach($name in @("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")){ $address=$command.payload.$name; if($address){$cell=$sheet.Range($address);$cells[$name]=@{cell=$address;value=$cell.Value2;formula=$cell.Formula}}}; Result @{current=$cells;proposed=$command.payload.proposed;mappingConfirmed=$command.payload.mappingConfirmed} }
    { $_ -eq "APPLY_CHANGE" -or $_ -eq "APPLY_OFFICIAL_PILOT" } {
      if ($workbook.ReadOnly) { throw "WORKBOOK_READ_ONLY:$($workbook.FullName)" }
      if (!$workbook.Saved) { throw "WORKBOOK_UNSAVED:$($workbook.FullName)" }
      if (!$command.payload.mappingConfirmed) { throw "MAPPING_NOT_CONFIRMED" }
      if ($command.type -eq "APPLY_OFFICIAL_PILOT") {
        $currentPilotRow = FindPilotRow $sheet ([string]$command.payload.fleet) ([string]$command.payload.implement) 7
        if ($currentPilotRow -ne [int]$command.payload.row) { throw "ROW_CONFLICT:$($command.payload.row)|$currentPilotRow" }
        $actualBackupHash = FileHash ([string]$command.payload.backupPath)
        if ($actualBackupHash -ne [string]$command.payload.backupHash) { throw "BACKUP_HASH_MISMATCH:$($command.payload.backupHash)|$actualBackupHash" }
        $currentWorkbookHash = FileHash ([string]$workbook.FullName)
        if ($currentWorkbookHash -ne [string]$command.payload.expectedWorkbookHash) { throw "WORKBOOK_CONFLICT:$($command.payload.expectedWorkbookHash)|$currentWorkbookHash" }
        EnsurePilotMergeWhitelist $sheet $currentPilotRow
      }
      $fieldNames=@("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")
      foreach($name in $fieldNames){
        $address=$command.payload.$name; if(!$address){continue}; $field=$name.Replace("Cell","")
        if($command.payload.editableFields -notcontains $field){throw "FIELD_NOT_EDITABLE:$field"}
        $cell=$sheet.Range($address); $expected=$command.payload.expectedCurrent.$field; $actual=$cell.Value2
        if(!(ValuesEqual $actual $expected)){throw "CELL_CONFLICT:$address|$expected|$actual|$($command.payload.proposed.$field)"}
        if($cell.HasFormula){throw "FORMULA_PROTECTED:$address"}
      }
      $savedValues=[ordered]@{}
      foreach($name in $fieldNames){$address=$command.payload.$name;if(!$address){continue};$field=$name.Replace("Cell","");$savedValues[$field]=$sheet.Range($address).Value2}
      $excel.EnableEvents=$false
      try {
        foreach($name in $fieldNames){
          $address=$command.payload.$name;if(!$address){continue};$field=$name.Replace("Cell","");$target=$sheet.Range($address);$proposed=$command.payload.proposed.$field
          if($target.MergeCells){$mergeArea=$target.MergeArea;if($null-eq $proposed -or [string]$proposed -eq ""){$mergeArea.ClearContents()}else{$mergeArea.Cells.Item(1,1).Value2=$proposed}}
          elseif($null-eq $proposed -or [string]$proposed -eq ""){$target.ClearContents()}
          else{$target.Value2=$proposed}
        }
        $workbook.Save()
      } catch {
        $writeError = $_
        $restoredAreas=@{}
        foreach($name in $fieldNames){$address=$command.payload.$name;if(!$address){continue};$field=$name.Replace("Cell","");$restoreCell=$sheet.Range($address);$restoreValue=$savedValues[$field];try{if($restoreCell.MergeCells){$area=$restoreCell.MergeArea;$areaAddress=$area.Address();if($restoredAreas.ContainsKey($areaAddress)){continue};$restoredAreas[$areaAddress]=$true;if($null-eq $restoreValue){$area.ClearContents()}else{$area.Cells.Item(1,1).Value2=$restoreValue}}elseif($null-eq $restoreValue){$restoreCell.ClearContents()}else{$restoreCell.Value2=$restoreValue}}catch{}}
        $restorationSaved = $false
        try { $workbook.Save(); $restorationSaved = $true } catch {}
        $failureHash = ""
        try { $failureHash = FileHash ([string]$workbook.FullName) } catch {}
        if(!$openedWorkbook){try{$workbook.Saved=$true}catch{}}
        throw "WRITE_SAVE_FAILED:$failureHash|restorationSaved=$restorationSaved|$($writeError.Exception.Message)"
      } finally { $excel.EnableEvents=$previousEnableEvents }
      $values=[ordered]@{}; $differences=@()
      foreach($name in $fieldNames){$address=$command.payload.$name;if($address){$field=$name.Replace("Cell","");$actual=$sheet.Range($address).Value2;$values[$field]=$actual;if(!(ValuesEqual $actual $command.payload.proposed.$field)){$differences+=@{cell=$address;expected=$command.payload.proposed.$field;actual=$actual}}}}
      $writtenHash = FileHash ([string]$workbook.FullName)
      if($differences.Count -gt 0){throw "WRITE_VERIFICATION_FAILED:$writtenHash|$($differences|ConvertTo-Json -Compress)"}
      Result @{saved=$true;verified=$true;values=$values;writtenHash=$writtenHash;eventsRestored=($excel.EnableEvents -eq $previousEnableEvents);macrosExecuted=$false}
    }
    "VERIFY_CHANGE" { $values=@{};$matches=$true;foreach($name in @("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")){ $address=$command.payload.$name;if($address){$field=$name.Replace("Cell","");$actual=$sheet.Range($address).Value2;$values[$field]=$actual;if($null-ne $command.payload.proposed -and !(ValuesEqual $actual $command.payload.proposed.$field)){$matches=$false}}};Result @{values=$values;matches=$matches} }
    "SAVE_DEV_WORKBOOK" { $workbook.Save(); Result @{saved=$true} }
    "COPY_RANGE_AS_PICTURE" { [void]$workbook.Activate();[void]$sheet.Activate();$range=$sheet.Range($command.payload.range);[void]$range.Select();$copied=$false;foreach($attempt in 1..3){try{[void]$range.CopyPicture(1,2);Start-Sleep -Milliseconds 500;$copied=$true;break}catch{Start-Sleep -Milliseconds 300}};if(!$copied){throw "COPY_PICTURE_FAILED:$($command.payload.range)"};$before=$sheet.ChartObjects().Count;$chart=$sheet.ChartObjects().Add(0,0,$range.Width,$range.Height);try{[void]$chart.Activate();[void]$chart.Chart.Paste();Start-Sleep -Milliseconds 700;$shapes=$chart.Chart.Shapes.Count;if($shapes-lt 1){throw "COPY_PICTURE_EMPTY:$($command.payload.range)"};$ok=$chart.Chart.Export($command.payload.tempPath,"PNG");Result @{exported=$ok;tempPath=$command.payload.tempPath;range=$command.payload.range;chartObjectsBefore=$before;chartObjectsDuring=$sheet.ChartObjects().Count;shapes=$shapes}}finally{[void]$chart.Delete()} }
    "HEALTH_CHECK" { Result @{healthy=$true;excelVersion=$excel.Version;createdExcel=$createdExcel;workbook=$workbook.Name} }
    default { throw "UNSUPPORTED_COMMAND:$($command.type)" }
  }
} catch { Write-Error "$($_.Exception.Message)|$($_.ScriptStackTrace)"; exit 1 }
finally {
  if ($null -ne $excel) {
    if ($null -ne $previousEnableEvents) { try { $excel.EnableEvents=$previousEnableEvents } catch {} }
    if ($null -ne $previousDisplayAlerts) { try { $excel.DisplayAlerts=$previousDisplayAlerts } catch {} }
    if ($null -ne $previousAskToUpdateLinks) { try { $excel.AskToUpdateLinks=$previousAskToUpdateLinks } catch {} }
    if ($null -ne $previousAutomationSecurity) { try { $excel.AutomationSecurity=$previousAutomationSecurity } catch {} }
  }
  # OPEN_LOCAL_WORKBOOK is an interactive operation: leave the user's
  # workbook and Excel instance open. Read/write commands still clean up
  # automation-owned objects as before.
  $keepInteractive = $command.type -eq "OPEN_LOCAL_WORKBOOK" -or $command.type -eq "OPEN_DEV_WORKBOOK"
  if(!$keepInteractive -and $openedWorkbook -and $null-ne $workbook){try{$workbook.Close($false)}catch{}}
  if(!$keepInteractive -and $createdExcel -and $null-ne $excel){try{$excel.Quit()}catch{}}
  foreach($object in @($sheet,$workbook,$excel)){if($null-ne $object){try{[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object)}catch{}}}
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
