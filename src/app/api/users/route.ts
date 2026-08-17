import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function checkAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = await verifyJwtToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;
  
  return payload;
}

export async function GET(req: Request) {
  try {
    const payload = await checkAdminAccess();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        notificationEmail: true,
        role: true,
        supportTier: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await checkAdminAccess();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { name, email, notificationEmail, password, role, supportTier, status } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        notificationEmail: notificationEmail ? notificationEmail.trim() : null,
        passwordHash: hashedPassword,
        role: role || 'AGENT',
        supportTier: supportTier || 'TIER_1',
        status: status || 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        notificationEmail: true,
        role: true,
        supportTier: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const payload = await checkAdminAccess();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'An array of user IDs is required' }, { status: 400 });
    }

    // Check if any target user is an Admin
    const targetUsers = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true },
    });

    const hasAdmin = targetUsers.some((u) => u.role === 'ADMIN');
    if (hasAdmin) {
      return NextResponse.json({ error: 'Admin accounts cannot be deleted.' }, { status: 403 });
    }

    // Safely unassign tickets currently assigned to these users
    await prisma.ticket.updateMany({
      where: { assignedAgentId: { in: ids } },
      data: { assignedAgentId: null },
    });

    // Delete the users
    await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ success: true, message: 'Users deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Bulk delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
