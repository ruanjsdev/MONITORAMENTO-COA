export function extractEquipment(text: string) {
  const match = text.match(/\b(\d{3,6}(?:\s*\/\s*\d{3,6})*)\b/);
  if (!match) return { mainEquipment: null, attachments: [], equipmentSet: null };
  const parts = match[1].split("/").map((x) => x.trim());
  return { mainEquipment: parts[0], attachments: parts.slice(1), equipmentSet: parts.join("/") };
}
