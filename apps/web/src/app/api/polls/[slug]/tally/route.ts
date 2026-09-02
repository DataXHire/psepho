import { NextRequest, NextResponse } from 'next/server';
import { db, sha256 } from '@/lib/db';
import { polls, options, tallies, ballots, pollResults } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getBallotTokenFromRequest,
  generateETag,
  jsonError,
} from '@/lib/api-helpers';
import { PollTallyResult } from '@psepho/core';

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

    const isClosed =
      poll.closedAt !== null || (poll.closesAt !== null && new Date() > poll.closesAt);

    // Get all tallies for this poll
    const tallyRows = await db.query.tallies.findMany({
      where: eq(tallies.pollId, poll.id),
    });

    // Calculate total votes
    let totalVotes = 0;
    let latestUpdatedAt = poll.createdAt;
    for (const t of tallyRows) {
      totalVotes += t.count;
      if (t.updatedAt > latestUpdatedAt) {
        latestUpdatedAt = t.updatedAt;
      }
    }

    // Determine visibility
    let isHidden = false;
    if (poll.visibility === 'after_close' && !isClosed) {
      // Must return ONLY total count, per-option breakdown completely absent from payload!
      isHidden = true;
    } else if (poll.visibility === 'after_vote') {
      const ballotToken = getBallotTokenFromRequest(req, slug);
      let hasVoted = false;
      if (ballotToken) {
        const tokenHash = sha256(ballotToken);
        const userBallot = await db.query.ballots.findFirst({
          where: and(eq(ballots.pollId, poll.id), eq(ballots.ballotTokenHash, tokenHash)),
        });
        if (userBallot) hasVoted = true;
      }
      if (!hasVoted && !isClosed) {
        isHidden = true;
      }
    }

    // Generate strong ETag
    const etag = generateETag(latestUpdatedAt, totalVotes);
    const ifNoneMatch = req.headers.get('if-none-match');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': 'public, max-age=1, must-revalidate',
        },
      });
    }

    let optionTallies = null;
    let irvPayload = null;

    if (!isHidden) {
      // Order options by position
      const pollOptions = await db.query.options.findMany({
        where: eq(options.pollId, poll.id),
        orderBy: (o, { asc }) => [asc(o.position)],
      });

      const tallyMap = new Map<string, number>();
      for (const t of tallyRows) {
        tallyMap.set(t.optionId, t.count);
      }

      optionTallies = pollOptions.map((opt) => {
        const count = tallyMap.get(opt.id) || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;
        return {
          optionId: opt.id,
          count,
          percentage,
        };
      });

      if (poll.kind === 'ranked') {
        const cachedResult = await db.query.pollResults.findFirst({
          where: eq(pollResults.pollId, poll.id),
        });
        irvPayload = cachedResult?.payload || null;
      }
    }

    const payload: PollTallyResult = {
      totalBallots: totalVotes,
      tallies: optionTallies, // Note: null when isHidden! per-option breakdown absent!
      visibility: poll.visibility as any,
      isHidden,
      closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
      updatedAt: latestUpdatedAt.toISOString(),
      irvResult: irvPayload as any,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=1, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Error fetching tally:', err);
    return jsonError('Failed to fetch tally', 500);
  }
}
