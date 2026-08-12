import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signJwtToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });
    console.log('Login attempt for:', email, 'User found:', !!user);

    if (!user) {
      console.log('User not found in DB');
      return NextResponse.json({ error: 'Invalid credentials (User not found)' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Password does not match');
      return NextResponse.json({ error: 'Invalid credentials (Password mismatch)' }, { status: 401 });
    }

    const token = await signJwtToken({ userId: user.id, role: user.role, email: user.email });

    const response = NextResponse.json({ success: true, role: user.role }, { status: 200 });
    
    // Set HTTP-only cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
