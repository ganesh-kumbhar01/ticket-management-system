import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isProtectedDemoEmail } from '@/lib/demoSecurity';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }

    // Find the user with this token where the expiry is in the future
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // DEMO PROTECTION GUARD: Prevent resetting passwords of protected demo accounts
    if (isProtectedDemoEmail(user.email)) {
      return NextResponse.json({ 
        error: '🔒 Demo Protection Active: Password reset is disabled for public demo accounts to prevent reviewer lockout.' 
      }, { status: 403 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and clear the reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Password has been reset successfully' }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
