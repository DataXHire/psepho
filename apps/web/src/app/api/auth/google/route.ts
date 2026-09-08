import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { UserProfile } from '@/lib/collective/types';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let googleId = body.googleId;
    let email = body.email;
    let name = body.name;
    let avatar = body.avatar;

    // Handle Google Identity Services credential (JWT)
    if (body.credential && typeof body.credential === 'string') {
      const decoded = parseJwt(body.credential);
      if (decoded && decoded.sub) {
        googleId = decoded.sub;
        email = decoded.email || `${decoded.sub}@gmail.com`;
        name = decoded.name || decoded.given_name || 'Google User';
        avatar = decoded.picture;
      }
    }

    if (!googleId || !email) {
      return NextResponse.json(
        { error: 'Missing required Google identification details' },
        { status: 400 }
      );
    }

    let existingUser = null;
    let isFirstSignIn = true;

    try {
      existingUser = await db.query.users.findFirst({
        where: or(eq(users.googleId, googleId), eq(users.email, email)),
      });

      if (existingUser) {
        isFirstSignIn = !existingUser.onboardingCompleted;
      } else {
        const [inserted] = await db
          .insert(users)
          .values({
            googleId,
            email,
            name: name || 'Google User',
            avatar: avatar || null,
            onboardingCompleted: false,
          })
          .returning();
        existingUser = inserted;
        isFirstSignIn = true;
      }
    } catch (dbError) {
      // Graceful fallback for offline database / development mode
      console.warn('Database offline or unavailable, continuing with session state:', dbError);
      isFirstSignIn = true;
    }

    const cookieStore = await cookies();
    cookieStore.set('psepho_user_id', existingUser?.id || `google-${googleId}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const profile: Partial<UserProfile> = {
      id: existingUser?.id || `google-${googleId}`,
      googleId,
      email,
      name: existingUser?.name || name,
      avatar: existingUser?.avatar || avatar,
      role: existingUser?.role || 'Civic participant',
      city: existingUser?.city || '',
      district: existingUser?.district || '',
      districtId: existingUser?.districtId || undefined,
      stateId: existingUser?.stateId || 'in-ka',
      stateCode: existingUser?.stateCode || 'KA',
      region: (existingUser?.region as any) || 'South',
      birthDate:
        existingUser?.birthYear
          ? {
              year: existingUser.birthYear,
              month: existingUser.birthMonth || undefined,
              day: existingUser.birthDay || undefined,
            }
          : undefined,
      birthPrecision: (existingUser?.birthPrecision as any) || 'year',
      ageCohort: (existingUser?.ageCohort as any) || '25-34',
      sector: 'General',
    };

    return NextResponse.json({
      success: true,
      isFirstSignIn,
      user: profile,
    });
  } catch (error) {
    console.error('Error handling Google Sign-In:', error);
    return NextResponse.json({ error: 'Failed to process Google sign-in' }, { status: 500 });
  }
}
