export type AvailableWhatsAppGroup = { id: string; subject: string; participants: unknown[] };

export function mapAvailableGroups(groups: AvailableWhatsAppGroup[]) {
  return groups.map(group => ({ externalId: group.id, name: group.subject, participantCount: group.participants.length }));
}

export function searchAvailableGroups<T extends { name: string; externalId: string }>(groups: T[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  return normalized ? groups.filter(group => group.name.toLocaleLowerCase("pt-BR").includes(normalized) || group.externalId.toLowerCase().includes(normalized)) : groups;
}

export function selectSingleGroup<T extends { externalId: string }>(groups: T[], externalId: string) {
  return groups.map(group => ({ ...group, selected: group.externalId === externalId, monitored: group.externalId === externalId }));
}

export function shadowGroupPersistence(externalId: string) {
  return { externalId, isActive: true, active: true, isMonitored: true, receivesReports: false, isTestGroup: true, connectionStatus: "shadow-readonly" } as const;
}

export function shouldCaptureShadowMessage(selectedExternalId: string | null, incomingExternalId: string) {
  return Boolean(selectedExternalId && selectedExternalId === incomingExternalId);
}

export function requireConnectedWhatsApp(state?: string) {
  if (state !== "ONLINE") throw new Error("WHATSAPP_DISCONNECTED");
}

export async function resolveAuditUserId(client: { user: { findUnique(input: { where: { email: string }; select: { id: true } }): Promise<{ id: string } | null> } }, email?: string) {
  if (!email) return null;
  return (await client.user.findUnique({ where: { email }, select: { id: true } }))?.id ?? null;
}

export function maskJid(value: string | null) {
  if (!value) return "—";
  const [number, domain] = value.split("@");
  return `${number.slice(0, 4)}••••${number.slice(-3)}@${domain ?? "g.us"}`;
}
