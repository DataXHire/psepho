import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { cohortForBirthDate, isUsableBirthDate, regionForState } from '@/lib/collective/demographics';
import { INDIA_MAP } from '@/lib/collective/geo';
import type { BirthDate, BirthPrecision, UserProfile } from '@/lib/collective/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      birthDate,
      precision = 'year',
      location,
      city = '',
      role = 'Civic participant',
    } = body as {
      userId: string;
      name: string;
      birthDate: BirthDate;
      precision: BirthPrecision;
      location: { stateId: string; districtId?: string; districtName?: string };
      city?: string;
      role?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!isUsableBirthDate(birthDate)) {
      return NextResponse.json({ error: 'A valid date of birth is required' }, { status: 400 });
    }

    const stateId = location?.stateId || 'in-ka';
    const stateObj = INDIA_MAP.shapes.find((s) => s.id === stateId);
    const stateCode = stateObj?.code || 'KA';
    const region = regionForState(stateId);
    const ageCohort = cohortForBirthDate(birthDate);

    // Filter birth date strictly according to the selected precision
    const filteredBirthDate: BirthDate = {
      year: birthDate.year,
      month: precision === 'month' || precision === 'day' ? birthDate.month : undefined,
      day: precision === 'day' ? birthDate.day : undefined,
    };

    let updatedUser = null;

    try {
      if (userId && !userId.startsWith('google-')) {
        const [u] = await db
          .update(users)
          .set({
            name: name.trim(),
            birthYear: filteredBirthDate.year,
            birthMonth: filteredBirthDate.month || null,
            birthDay: filteredBirthDate.day || null,
            birthPrecision: precision,
            ageCohort,
            stateId,
            stateCode,
            district: location?.districtName || '',
            districtId: location?.districtId || null,
            city: city.trim() || location?.districtName || stateObj?.name || '',
            region,
            role: role.trim() || 'Civic participant',
            onboardingCompleted: true,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
        updatedUser = u;
      }
    } catch (dbErr) {
      console.warn('Database error during complete-profile (fallback to client state):', dbErr);
    }

    const cookieStore = await cookies();
    cookieStore.set('psepho_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    const profile: UserProfile = {
      id: userId,
      name: name.trim(),
      avatar: updatedUser?.avatar || name.trim().slice(0, 2).toUpperCase(),
      email: updatedUser?.email,
      googleId: updatedUser?.googleId,
      role: role.trim() || 'Civic participant',
      city: city.trim() || location?.districtName || stateObj?.name || '',
      district: location?.districtName || '',
      districtId: location?.districtId,
      stateId,
      stateCode,
      region,
      birthDate: filteredBirthDate,
      birthPrecision: precision,
      ageCohort,
      sector: 'General',
    };

    return NextResponse.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    console.error('Error completing profile:', error);
    return NextResponse.json({ error: 'Failed to complete profile' }, { status: 500 });
  }
}
