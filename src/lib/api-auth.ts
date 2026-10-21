import { NextRequest, NextResponse } from 'next/server';
import { validateSession, SessionUser } from './auth';

export interface AuthContext {
  user: SessionUser;
  tabToken: string;
}

/**
 * Extracts and validates session and tab context from NextRequest
 */
export async function getAuthenticatedUser(
  req: NextRequest,
  requiredRole?: 'ADMIN' | 'MANAGER' | 'VIEWER'
): Promise<{ user: SessionUser | null; errorResponse: NextResponse | null; tabToken: string | null }> {
  const sessionCookie = req.cookies.get('gashtyar_session')?.value;
  const tabToken =
    req.headers.get('x-tab-token') ||
    req.nextUrl.searchParams.get('tabToken') ||
    req.cookies.get('gashtyar_tab_token')?.value;

  if (!sessionCookie || !tabToken) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: 'Authentication required. Please verify with your email code.' },
        { status: 401 }
      ),
      tabToken: null,
    };
  }

  const sessionResult = await validateSession(sessionCookie, tabToken);

  if (!sessionResult.valid || !sessionResult.user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: sessionResult.error || 'Invalid or expired session. Please verify again.' },
        { status: 401 }
      ),
      tabToken,
    };
  }

  const user = sessionResult.user;

  // Role check
  if (requiredRole) {
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: IT Administrator access required.' },
          { status: 403 }
        ),
        tabToken,
      };
    }
    if (requiredRole === 'MANAGER' && user.role === 'VIEWER') {
      return {
        user: null,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Manager or Administrator access required.' },
          { status: 403 }
        ),
        tabToken,
      };
    }
  }

  return { user, errorResponse: null, tabToken };
}
