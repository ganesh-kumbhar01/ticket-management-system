import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL('/login', req.url));
  
  response.cookies.set({
    name: 'auth-token',
    value: '',
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}
