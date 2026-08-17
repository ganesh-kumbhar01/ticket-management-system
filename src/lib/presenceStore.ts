import { prisma } from '@/lib/db';

export type Presence = {
  userId: string;
  userName: string;
  userRole?: string;
  ticketId: string;
  lastSeen: number;
};

// Global in-memory cache + persistent Database sync for Serverless environments
declare global {
  // eslint-disable-next-line no-var
  var __globalPresenceStore: Presence[] | undefined;
}

if (!globalThis.__globalPresenceStore) {
  globalThis.__globalPresenceStore = [];
}

const memoryStore = globalThis.__globalPresenceStore;

export async function updatePresence(ticketId: string, userId: string, userName: string, userRole?: string) {
  const now = Date.now();
  
  // 1. Update in memory
  const existing = memoryStore.find(p => p.ticketId === ticketId && p.userId === userId);
  if (existing) {
    existing.lastSeen = now;
    existing.userName = userName;
    if (userRole) existing.userRole = userRole;
  } else {
    memoryStore.push({ ticketId, userId, userName, userRole, lastSeen: now });
  }

  // 2. Persist to Database for cross-instance / cross-browser serverless synchronization
  try {
    await prisma.agentPresence.upsert({
      where: {
        ticketId_userId: { ticketId, userId }
      },
      update: {
        userName,
        userRole: userRole || null,
        updatedAt: new Date()
      },
      create: {
        ticketId,
        userId,
        userName,
        userRole: userRole || null,
      }
    });
  } catch (err) {
    // Silent fallback to memory store
  }

  // Clean memory store
  for (let i = memoryStore.length - 1; i >= 0; i--) {
    if (now - memoryStore[i].lastSeen > 20000) {
      memoryStore.splice(i, 1);
    }
  }
}

export async function removePresence(ticketId: string, userId: string) {
  // Remove from memory
  for (let i = memoryStore.length - 1; i >= 0; i--) {
    if (memoryStore[i].ticketId === ticketId && memoryStore[i].userId === userId) {
      memoryStore.splice(i, 1);
    }
  }

  // Remove from Database
  try {
    await prisma.agentPresence.deleteMany({
      where: { ticketId, userId }
    });
  } catch (err) {
    // ignore
  }
}

export async function getPresence(ticketId: string, currentUserId: string): Promise<Presence[]> {
  const threshold = new Date(Date.now() - 15000);

  try {
    const dbPresences = await prisma.agentPresence.findMany({
      where: {
        ticketId,
        userId: { not: currentUserId },
        updatedAt: { gte: threshold }
      }
    });

    if (dbPresences && dbPresences.length > 0) {
      return dbPresences.map(p => ({
        userId: p.userId,
        userName: p.userName,
        userRole: p.userRole || undefined,
        ticketId: p.ticketId,
        lastSeen: new Date(p.updatedAt).getTime()
      }));
    }
  } catch (err) {
    // Database query fallback
  }

  // Fallback to memory
  const now = Date.now();
  return memoryStore.filter(
    p => p.ticketId === ticketId && p.userId !== currentUserId && (now - p.lastSeen <= 15000)
  );
}

export async function getAllActivePresences(currentUserId?: string): Promise<Presence[]> {
  const threshold = new Date(Date.now() - 15000);

  try {
    const dbPresences = await prisma.agentPresence.findMany({
      where: {
        ...(currentUserId && { userId: { not: currentUserId } }),
        updatedAt: { gte: threshold }
      }
    });

    if (dbPresences && dbPresences.length > 0) {
      return dbPresences.map(p => ({
        userId: p.userId,
        userName: p.userName,
        userRole: p.userRole || undefined,
        ticketId: p.ticketId,
        lastSeen: new Date(p.updatedAt).getTime()
      }));
    }
  } catch (err) {
    // Database query fallback
  }

  // Fallback to memory
  const now = Date.now();
  return memoryStore.filter(
    p => (!currentUserId || p.userId !== currentUserId) && (now - p.lastSeen <= 15000)
  );
}
