import { NextRequest, NextResponse } from 'next/server';
import { db, sha256 } from '@/lib/db';
import { polls } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCreatorTokenFromRequest, jsonError } from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    let creatorToken = getCreatorTokenFromRequest(req);

    if (!creatorToken) {
      try {
        const body = await req.json();
        creatorToken = body.creatorToken;
      } catch {
        // ignore
      }
    }

    if (!creatorToken) {
      return jsonError('Creator token required', 401, 'UNAUTHORIZED');
    }

    const poll = await db.query.polls.findFirst({
      where: eq(polls.slug, slug),
    });

    if (!poll) {
      return jsonError('Poll not found', 404);
    }

    if (poll.creatorTokenHash !== sha256(creatorToken)) {
      return jsonError('Invalid creator token', 403, 'FORBIDDEN');
    }

    const now = new Date();
    const [updated] = await db
      .update(polls)
      .set({
        closedAt: now,
      })
      .where(eq(polls.id, poll.id))
      .returning();

    return NextResponse.json({
      success: true,
      closedAt: updated.closedAt?.toISOString(),
    });
  } catch (err) {
    console.error('Error closing poll:', err);
    return jsonError('Failed to close poll', 500);
  }
}
