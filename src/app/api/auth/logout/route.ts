import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('gashtyar_session')?.value;
  if (sessionCookie) {
    await destroySession(sessionCookie);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.delete('gashtyar_session');
  return response;
}
