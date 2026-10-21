import { NextRequest, NextResponse } from 'next/server';
import { verifyCodeAndCreateSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code, tabToken } = body;

    if (!email || !code || !tabToken) {
      return NextResponse.json(
        { error: 'Email, verification code, and tab token are required.' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const result = await verifyCodeAndCreateSession(
      email,
      code,
      tabToken,
      ipAddress,
      userAgent
    );

    if (!result.success || !result.sessionToken) {
      return NextResponse.json(
        { error: result.error || 'Verification failed.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      redirectPath: result.redirectPath || '/',
    });

    // Set secure HttpOnly cookie for session token
    // 8-hour max age to match absolute session lifetime
    response.cookies.set('gashtyar_session', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    // Also set tab token cookie for standard browser fetches
    response.cookies.set('gashtyar_tab_token', tabToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    console.error('Verify code error:', err);
    return NextResponse.json(
      { error: 'Internal server error processing verification.' },
      { status: 500 }
    );
  }
}
