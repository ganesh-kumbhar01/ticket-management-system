import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isProtectedDemoEmail } from '@/lib/demoSecurity';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // DEMO PROTECTION GUARD
    if (isProtectedDemoEmail(email)) {
      return NextResponse.json({ 
        message: '🔒 Password reset is disabled for public demo accounts to prevent reviewer lockout.' 
      }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // For security, don't reveal if the user exists or not
      return NextResponse.json({ message: 'If the email exists, a reset link has been sent.' }, { status: 200 });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Expire in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    return NextResponse.json({
      message: 'If the email exists, a reset link has been sent.',
      devResetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined
    }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
