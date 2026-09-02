import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ballots, polls, options } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { jsonError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const url = new URL(req.url);
    const pollSlug = url.searchParams.get('poll');

    const cleanCode = code.toUpperCase().trim();

    // Query ballot by receipt code
    let whereClause = eq(ballots.receiptCode, cleanCode);
    if (pollSlug) {
      const poll = await db.query.polls.findFirst({
        where: eq(polls.slug, pollSlug),
      });
      if (poll) {
        whereClause = and(eq(ballots.receiptCode, cleanCode), eq(ballots.pollId, poll.id)) as any;
      }
    }

    const ballot = await db.query.ballots.findFirst({
      where: whereClause,
      with: {
        // We will fetch poll and options manually
      },
    });

    if (!ballot) {
      return NextResponse.json({
        found: false,
        code: cleanCode,
      });
    }

    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, ballot.pollId),
    });

    const pollOptions = await db.query.options.findMany({
      where: eq(options.pollId, ballot.pollId),
    });

    const optMap = new Map<string, string>();
    for (const o of pollOptions) {
      optMap.set(o.id, o.label);
    }

    const choiceIds = ballot.choice as string[];
    const optionLabels = choiceIds.map((id) => optMap.get(id) || id).join(', ');

    return NextResponse.json({
      found: true,
      code: cleanCode,
      question: poll?.question,
      pollSlug: poll?.slug,
      optionLabel: optionLabels,
      castAt: ballot.castAt.toISOString(),
    });
  } catch (err) {
    console.error('Error looking up receipt:', err);
    return jsonError('Failed to lookup receipt', 500);
  }
}
