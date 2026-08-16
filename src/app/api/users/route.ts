import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Middleware-like function to check admin access
async function checkAdminAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = await verifyJwtToken(token);
  if (!payload || payload.role !== 'ADMIN') return null;
  
  return payload;
}

export async function GET() {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAdmin = await checkAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { name, email, notificationEmail, password, role, supportTier, status } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name || null,
        email,
        notificationEmail: notificationEmail?.trim() || null,
        passwordHash: hashedPassword,
        role: role === 'ADMIN' ? 'ADMIN' : 'AGENT',
        supportTier: supportTier && ['TIER_1', 'TIER_2', 'TIER_3'].includes(supportTier) ? supportTier : 'TIER_1',
        status: status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
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

    // Prevent admin from deleting themselves
    if (ids.includes(payload.userId)) {
      return NextResponse.json({ error: 'You cannot delete your own account in a bulk action' }, { status: 400 });
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
