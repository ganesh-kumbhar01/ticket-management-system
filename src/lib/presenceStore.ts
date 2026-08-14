export type Presence = {
  userId: string;
  userName: string;
  userRole?: string;
  ticketId: string;
  lastSeen: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __globalPresenceStore: Presence[] | undefined;
}

if (!globalThis.__globalPresenceStore) {
  globalThis.__globalPresenceStore = [];
}

const presenceStore = globalThis.__globalPresenceStore;

export function updatePresence(ticketId: string, userId: string, userName: string, userRole?: string) {
  const now = Date.now();
  const existing = presenceStore.find(p => p.ticketId === ticketId && p.userId === userId);
  
  if (existing) {
    existing.lastSeen = now;
    existing.userName = userName;
    if (userRole) existing.userRole = userRole;
  } else {
    presenceStore.push({ ticketId, userId, userName, userRole, lastSeen: now });
  }

  // Clean up stale presence (older than 20 seconds)
  for (let i = presenceStore.length - 1; i >= 0; i--) {
    if (now - presenceStore[i].lastSeen > 20000) {
      presenceStore.splice(i, 1);
    }
  }
}

export function removePresence(ticketId: string, userId: string) {
  for (let i = presenceStore.length - 1; i >= 0; i--) {
    if (presenceStore[i].ticketId === ticketId && presenceStore[i].userId === userId) {
      presenceStore.splice(i, 1);
    }
  }
}

export function getPresence(ticketId: string, currentUserId: string) {
  const now = Date.now();
  return presenceStore.filter(
    p => p.ticketId === ticketId && p.userId !== currentUserId && (now - p.lastSeen <= 15000)
  );
}

export function getAllActivePresences(currentUserId?: string) {
  const now = Date.now();
  return presenceStore.filter(
    p => (!currentUserId || p.userId !== currentUserId) && (now - p.lastSeen <= 15000)
  );
}
