param([Parameter(Mandatory=$true)][string]$InputBase64)
$ErrorActionPreference = "Stop"
$inputJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($InputBase64))
$command = $inputJson | ConvertFrom-Json
$excel = $null; $createdExcel = $false; $openedWorkbook = $false; $workbook = $null
function Result($value) { $value | ConvertTo-Json -Depth 12 -Compress }
function ExcelInstalled { try { $type=[type]::GetTypeFromProgID("Excel.Application"); return $null -ne $type } catch { return $false } }
function GetExcel([bool]$allowCreate) {
  try { return [Runtime.InteropServices.Marshal]::GetActiveObject("Excel.Application") } catch {}
  if (!$allowCreate) { return $null }
  $script:createdExcel=$true; $app=New-Object -ComObject Excel.Application; $app.Visible=$false; return $app
}
function GetWorkbook($app,[string]$file,[bool]$readOnly) {
  $full=[IO.Path]::GetFullPath($file)
  foreach($book in $app.Workbooks){if([IO.Path]::GetFullPath($book.FullName) -eq $full){return $book}}
  $script:openedWorkbook=$true
  return $app.Workbooks.Open($full, 0, $readOnly)
}
try {
  if($command.type -eq "CHECK_EXCEL_INSTALLED"){Result @{installed=(ExcelInstalled);platform="win32"};exit 0}
  $allowCreate=$command.type -ne "LIST_OPEN_WORKBOOKS"
  $excel=GetExcel $allowCreate
  if($null -eq $excel){Result @{workbooks=@();connectedToUserInstance=$false};exit 0}
  $excel.DisplayAlerts=$false; $excel.EnableEvents=$false; $excel.AskToUpdateLinks=$false
  try{$excel.AutomationSecurity=3}catch{}
  if($command.type -eq "LIST_OPEN_WORKBOOKS"){Result @{workbooks=@($excel.Workbooks|ForEach-Object{@{name=$_.Name;fullName=$_.FullName;readOnly=$_.ReadOnly}});connectedToUserInstance=(-not $createdExcel)};exit 0}
  $writeAction=@("APPLY_CHANGE","SAVE_DEV_WORKBOOK") -contains $command.type
  $workbook=GetWorkbook $excel $command.workbook (-not $writeAction)
  if($command.type -eq "OPEN_DEV_WORKBOOK"){Result @{name=$workbook.Name;fullName=$workbook.FullName;readOnly=$workbook.ReadOnly;createdExcel=$createdExcel};exit 0}
  if($command.type -eq "LIST_WORKSHEETS"){Result @{workbook=$workbook.Name;worksheets=@($workbook.Worksheets|ForEach-Object{@{name=$_.Name;visible=$_.Visible;usedRange=$_.UsedRange.Address()}})};exit 0}
  $sheet=$workbook.Worksheets.Item($command.worksheet)
  switch($command.type){
    "READ_CELL" { $cell=$sheet.Range($command.payload.cell);Result @{cell=$cell.Address($false,$false);value=$cell.Value2;formula=$cell.Formula;numberFormat=$cell.NumberFormat} }
    "READ_RANGE" { $range=$sheet.Range($command.payload.range);Result @{range=$range.Address();values=$range.Value2;formulas=$range.Formula} }
    "FIND_EQUIPMENT" {
      $column = [string]$command.payload.fleetColumn
      $fleet = [string]$command.payload.fleet
      $last = $sheet.Cells.Item($sheet.Rows.Count, $column).End(-4162).Row
      $matches = @()
      $firstRow = [int]$command.payload.headerRow + 1
      for($row = $firstRow; $row -le $last; $row++) {
        $cell = $sheet.Range("$column$row")
        if(([string]$cell.Text).Trim() -eq $fleet) {
          $merged = $null
          if($cell.MergeCells) { $merged = $cell.MergeArea.Address() }
          $matches += @{row=$row;cell=$cell.Address($false,$false);value=[string]$cell.Text;mergedArea=$merged}
        }
      }
      if($matches.Count -eq 0) { $status="NOT_FOUND" }
      elseif($matches.Count -eq 1) { $status="UNIQUE_MATCH" }
      else { $status="AMBIGUOUS_MATCH" }
      Result @{status=$status;fleet=$fleet;candidates=$matches}
    }
    "PREVIEW_CHANGE" { $cells=@{};foreach($name in @("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")){ $address=$command.payload.$name;if($address){$cell=$sheet.Range($address);$cells[$name]=@{cell=$address;value=$cell.Value2;formula=$cell.Formula}}};Result @{current=$cells;proposed=$command.payload.proposed;mappingConfirmed=$command.payload.mappingConfirmed} }
    "APPLY_CHANGE" {
      if(!$command.payload.mappingConfirmed){throw "MAPPING_NOT_CONFIRMED"}
      $fieldNames=@("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")
      foreach($name in $fieldNames){
        $address=$command.payload.$name;if(!$address){continue};$field=$name.Replace("Cell","")
        if($command.payload.editableFields -notcontains $field){throw "FIELD_NOT_EDITABLE:$field"}
        $cell=$sheet.Range($address);$expected=$command.payload.expectedCurrent.$field;$actual=$cell.Value2
        $equal=([string]$actual -eq [string]$expected)
        if($actual -is [ValueType] -and $expected -is [ValueType]){$equal=[Math]::Abs(([double]$actual)-([double]$expected)) -lt 0.000000001}
        if(!$equal){throw "CELL_CONFLICT:$address|$expected|$actual"}
        if($cell.HasFormula){throw "FORMULA_PROTECTED:$address"}
      }
      foreach($name in $fieldNames){$address=$command.payload.$name;if(!$address){continue};$field=$name.Replace("Cell","");$targetCell=$sheet.Range($address);if($targetCell.MergeCells){$targetCell=$targetCell.MergeArea.Cells.Item(1,1)};$proposed=$command.payload.proposed.$field;if($null-eq $proposed){$targetCell.ClearContents()}else{$targetCell.Value2=$proposed}}
      $workbook.Save();$values=@{}
      foreach($name in $fieldNames){$address=$command.payload.$name;if($address){$values[$name.Replace("Cell","")]=$sheet.Range($address).Value2}}
      Result @{saved=$true;values=$values}
    }
    "VERIFY_CHANGE" { $values=@{};foreach($name in @("statusCell","descriptionCell","timeCell","startDateCell","startTimeCell","forecastDateCell","forecastTimeCell")){ $address=$command.payload.$name;if($address){$values[$name.Replace("Cell","")]=$sheet.Range($address).Value2}};Result @{values=$values;matches=$true} }
    "SAVE_DEV_WORKBOOK" { $workbook.Save();Result @{saved=$true} }
    "COPY_RANGE_AS_PICTURE" { [void]$workbook.Activate();[void]$sheet.Activate();$range=$sheet.Range($command.payload.range);[void]$range.Select();$copied=$false;foreach($attempt in 1..3){try{[void]$range.CopyPicture(1,2);Start-Sleep -Milliseconds 500;$copied=$true;break}catch{Start-Sleep -Milliseconds 300}};if(!$copied){throw "COPY_PICTURE_FAILED:$($command.payload.range)"};$before=$sheet.ChartObjects().Count;$chart=$sheet.ChartObjects().Add(0,0,$range.Width,$range.Height);try{[void]$chart.Activate();[void]$chart.Chart.Paste();Start-Sleep -Milliseconds 700;$shapes=$chart.Chart.Shapes.Count;if($shapes-lt 1){throw "COPY_PICTURE_EMPTY:$($command.payload.range)"};$ok=$chart.Chart.Export($command.payload.tempPath,"PNG");Result @{exported=$ok;tempPath=$command.payload.tempPath;range=$command.payload.range;chartObjectsBefore=$before;chartObjectsDuring=$sheet.ChartObjects().Count;shapes=$shapes}}finally{[void]$chart.Delete()} }
    "HEALTH_CHECK" { Result @{healthy=$true;excelVersion=$excel.Version;createdExcel=$createdExcel;workbook=$workbook.Name} }
    default { throw "UNSUPPORTED_COMMAND:$($command.type)" }
  }
} catch { Write-Error $_.Exception.Message; exit 1 }
finally {
  if($openedWorkbook -and $null-ne $workbook){try{$workbook.Close($false)}catch{}}
  if($createdExcel -and $null-ne $excel){try{$excel.Quit()}catch{}}
  foreach($object in @($sheet,$workbook,$excel)){if($null-ne $object){try{[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object)}catch{}}}
  [GC]::Collect();[GC]::WaitForPendingFinalizers()
}
