export type Presence = {
  userId: string;
  userName: string;
  ticketId: string;
  lastSeen: number;
};

const globalForPresence = global as unknown as { presenceStore: Presence[] };

export const presenceStore = globalForPresence.presenceStore || [];

if (process.env.NODE_ENV !== 'production') {
  globalForPresence.presenceStore = presenceStore;
}

export function updatePresence(ticketId: string, userId: string, userName: string) {
  const now = Date.now();
  const existing = presenceStore.find(p => p.ticketId === ticketId && p.userId === userId);
  
  if (existing) {
    existing.lastSeen = now;
    existing.userName = userName;
  } else {
    presenceStore.push({ ticketId, userId, userName, lastSeen: now });
  }

  // Clean up stale presence (older than 30 seconds)
  for (let i = presenceStore.length - 1; i >= 0; i--) {
    if (now - presenceStore[i].lastSeen > 30000) {
      presenceStore.splice(i, 1);
    }
  }
}

export function getPresence(ticketId: string, currentUserId: string) {
  const now = Date.now();
  return presenceStore.filter(p => p.ticketId === ticketId && p.userId !== currentUserId && (now - p.lastSeen <= 15000));
}
