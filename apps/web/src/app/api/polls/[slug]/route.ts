import { NextRequest, NextResponse } from 'next/server';
import { db, sha256 } from '@/lib/db';
import { polls, options, ballots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getBallotTokenFromRequest, getCreatorTokenFromRequest, jsonError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    const poll = await db.query.polls.findFirst({
      where: eq(polls.slug, slug),
    });

    if (!poll) {
      return jsonError('No poll at this link. It may have been deleted.', 404, 'POLL_NOT_FOUND');
    }

    const pollOptions = await db.query.options.findMany({
      where: eq(options.pollId, poll.id),
      orderBy: (opts, { asc }) => [asc(opts.position)],
    });

    // Check if client has already voted via ballot token
    const ballotToken = getBallotTokenFromRequest(req, slug);
    let userBallot = null;

    if (ballotToken) {
      const tokenHash = sha256(ballotToken);
      const existingBallot = await db.query.ballots.findFirst({
        where: and(eq(ballots.pollId, poll.id), eq(ballots.ballotTokenHash, tokenHash)),
      });

      if (existingBallot) {
        userBallot = {
          choice: existingBallot.choice as string[],
          receiptCode: existingBallot.receiptCode,
          castAt: existingBallot.castAt.toISOString(),
          revisedAt: existingBallot.revisedAt ? existingBallot.revisedAt.toISOString() : null,
        };
      }
    }

    return NextResponse.json({
      poll: {
        id: poll.id,
        slug: poll.slug,
        question: poll.question,
        kind: poll.kind,
        maxChoices: poll.maxChoices,
        integrity: poll.integrity,
        visibility: poll.visibility,
        allowRevision: poll.allowRevision,
        opensAt: poll.opensAt.toISOString(),
        closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
        closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
        createdAt: poll.createdAt.toISOString(),
      },
      options: pollOptions.map((opt) => ({
        id: opt.id,
        pollId: opt.pollId,
        position: opt.position,
        label: opt.label,
      })),
      ballot: userBallot,
    });
  } catch (err) {
    console.error('Error fetching poll:', err);
    return jsonError('Failed to fetch poll', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const creatorToken = getCreatorTokenFromRequest(req);

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

    await db.delete(polls).where(eq(polls.id, poll.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting poll:', err);
    return jsonError('Failed to delete poll', 500);
  }
}
