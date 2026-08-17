import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // ADMIN PROTECTION: Do not generate reset links for Admin accounts
    if (!user || user.role === 'ADMIN') {
      return NextResponse.json({ message: 'If the email exists and is eligible, a reset link has been sent.' }, { status: 200 });
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
      message: 'If the email exists and is eligible, a reset link has been sent.',
      devResetLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined
    }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
