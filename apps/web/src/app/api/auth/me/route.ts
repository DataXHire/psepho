import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import type { UserProfile } from '@/lib/collective/types';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('psepho_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ user: null });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user || !user.onboardingCompleted) {
        return NextResponse.json({ user: null, pending: !!user });
      }

      const profile: UserProfile = {
        id: user.id,
        name: user.name,
        avatar: user.avatar || user.name.slice(0, 2).toUpperCase(),
        email: user.email,
        googleId: user.googleId,
        role: user.role || 'Civic participant',
        city: user.city || '',
        district: user.district || '',
        districtId: user.districtId || undefined,
        stateId: user.stateId || 'in-ka',
        stateCode: user.stateCode || 'KA',
        region: (user.region as any) || 'South',
        birthDate: user.birthYear
          ? {
              year: user.birthYear,
              month: user.birthMonth || undefined,
              day: user.birthDay || undefined,
            }
          : undefined,
        birthPrecision: (user.birthPrecision as any) || 'year',
        ageCohort: (user.ageCohort as any) || '25-34',
        sector: 'General',
      };

      return NextResponse.json({ user: profile });
    } catch {
      return NextResponse.json({ user: null });
    }
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
  }
}
