import { NextRequest, NextResponse } from 'next/server';
import { db, sha256 } from '@/lib/db';
import { polls, ballots, options } from '@/lib/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getCreatorTokenFromRequest, jsonError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');
    const creatorToken = getCreatorTokenFromRequest(req) || tokenQuery;

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

    // Compute duplicate fingerprint signal:
    // Ballots with ip_hash appearing > 1 time
    const dupResult = await db.execute(sql`
      SELECT COALESCE(SUM(c), 0) as dup_count FROM (
        SELECT COUNT(*) as c
        FROM ballots
        WHERE poll_id = ${poll.id} AND ip_hash IS NOT NULL
        GROUP BY ip_hash
        HAVING COUNT(*) > 1
      ) sub;
    `);

    const duplicateSignalCount = Number(dupResult.rows[0]?.dup_count || 0);

    const totalBallotsResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM ballots WHERE poll_id = ${poll.id}
    `);
    const totalBallots = Number(totalBallotsResult.rows[0]?.total || 0);

    return NextResponse.json({
      poll: {
        id: poll.id,
        slug: poll.slug,
        question: poll.question,
        kind: poll.kind,
        integrity: poll.integrity,
        visibility: poll.visibility,
        allowRevision: poll.allowRevision,
        opensAt: poll.opensAt.toISOString(),
        closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
        closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
      },
      duplicateSignalCount,
      totalBallots,
    });
  } catch (err) {
    console.error('Error fetching manage data:', err);
    return jsonError('Failed to fetch manage data', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const creatorToken = getCreatorTokenFromRequest(req) || body.creatorToken;

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

    const updates: Partial<typeof polls.$inferInsert> = {};
    if (body.closesAt !== undefined) {
      updates.closesAt = body.closesAt ? new Date(body.closesAt) : null;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(polls).set(updates).where(eq(polls.id, poll.id));
    }

    return NextResponse.json({ success: true, updates });
  } catch (err) {
    console.error('Error updating poll:', err);
    return jsonError('Failed to update poll', 500);
  }
}
