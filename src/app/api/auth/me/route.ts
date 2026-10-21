import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function GET(req: NextRequest) {
  try {
    await seedDatabase();

    const sessionCookie = req.cookies.get('gashtyar_session')?.value;
    const tabToken = req.headers.get('x-tab-token') || req.nextUrl.searchParams.get('tabToken');

    if (!sessionCookie || !tabToken) {
      return NextResponse.json({
        authenticated: false,
        reason: !sessionCookie ? 'NO_SESSION_COOKIE' : 'NO_TAB_TOKEN',
      });
    }

    const result = await validateSession(sessionCookie, tabToken);

    if (!result.valid || !result.user) {
      return NextResponse.json({
        authenticated: false,
        reason: result.error || 'INVALID_SESSION',
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: result.user,
    });
  } catch (err: unknown) {
    console.error('Check session error:', err);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to check session.' },
      { status: 500 }
    );
  }
}
