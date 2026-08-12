import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const users = await prisma.user.findMany();
  const notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ users, notifications });
}
