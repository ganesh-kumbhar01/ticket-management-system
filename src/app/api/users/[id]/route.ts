import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwtToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function checkUserAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) return null;
  
  const payload = await verifyJwtToken(token);
  return payload;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkUserAccess();
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await Promise.resolve(params);
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Only allow admin or the user themselves
    if (payload.role !== 'ADMIN' && payload.userId !== id) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own profile' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, notificationEmail, role, supportTier, status, password, receiveAlerts } = body;

    // Verify user exists
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ADMIN LOCK: Admin accounts cannot have password, email, role, or status modified
    if (existingUser.role === 'ADMIN') {
      if (password) {
        return NextResponse.json({ 
          error: 'Admin password cannot be modified (Admin account is permanent and read-only).' 
        }, { status: 403 });
      }
      if (email && email.toLowerCase() !== existingUser.email.toLowerCase()) {
        return NextResponse.json({ 
          error: 'Admin login email cannot be modified.' 
        }, { status: 403 });
      }
      if (role && role !== 'ADMIN') {
        return NextResponse.json({ 
          error: 'Admin role cannot be changed.' 
        }, { status: 403 });
      }
      if (status && status !== 'ACTIVE') {
        return NextResponse.json({ 
          error: 'Admin account cannot be deactivated.' 
        }, { status: 403 });
      }
    }

    // If email is changing on an agent, ensure it doesn't collide
    if (email && email !== existingUser.email) {
      const collision = await prisma.user.findUnique({ where: { email } });
      if (collision) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (notificationEmail !== undefined) updateData.notificationEmail = notificationEmail ? notificationEmail.trim() : null;
    if (role !== undefined) updateData.role = role;
    if (supportTier !== undefined && ['TIER_1', 'TIER_2', 'TIER_3'].includes(supportTier)) {
      updateData.supportTier = supportTier;
    }
    if (status !== undefined) updateData.status = status;
    if (receiveAlerts !== undefined) updateData.receiveAlerts = Boolean(receiveAlerts);

    if (password && existingUser.role !== 'ADMIN') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        notificationEmail: true,
        receiveAlerts: true,
        role: true,
        supportTier: true,
        status: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, user: updatedUser }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await checkUserAccess();
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 401 });
    }

    const { id } = await Promise.resolve(params);

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (payload.userId === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // ADMIN LOCK: Admin accounts cannot be deleted
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admin accounts cannot be deleted.' }, { status: 403 });
    }

    // Safely unassign tickets currently assigned to this user
    await prisma.ticket.updateMany({
      where: { assignedAgentId: id },
      data: { assignedAgentId: null },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
