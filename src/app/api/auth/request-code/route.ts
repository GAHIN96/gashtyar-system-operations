import { NextRequest, NextResponse } from 'next/server';
import { createVerificationChallenge } from '@/lib/auth';
import { seedDatabase } from '@/lib/seed';

export async function POST(req: NextRequest) {
  try {
    // Ensure DB seeded on initial request if first run
    await seedDatabase();

    const body = await req.json();
    const { email, redirectPath } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const result = await createVerificationChallenge(
      email,
      redirectPath || '/',
      ipAddress,
      userAgent
    );

    if (!result.success && result.cooldownLeft) {
      return NextResponse.json(
        {
          error: `Please wait ${result.cooldownLeft} second(s) before requesting another code.`,
          cooldownLeft: result.cooldownLeft,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'A fresh, unique 6-digit verification code has been dispatched to it@gate2hotels.co. Please check your inbox to open the system.',
    });
  } catch (err: unknown) {
    console.error('Request code error:', err);
    return NextResponse.json(
      { error: 'Internal server error processing verification request.' },
      { status: 500 }
    );
  }
}
