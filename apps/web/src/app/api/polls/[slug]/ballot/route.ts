import { NextRequest, NextResponse } from 'next/server';
import { CastBallotSchema, generateReceiptCode, tabulateIRV } from '@psepho/core';
import { db, sha256 } from '@/lib/db';
import { polls, options, ballots, tallies, pollResults } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import {
  getClientIp,
  getUserAgent,
  computeIpHash,
  computeUaHash,
  jsonError,
} from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const body = await req.json();

    const parsed = CastBallotSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid ballot submission', 422, 'VALIDATION_ERROR', parsed.error.format());
    }

    const { choice, ballotToken } = parsed.data;

    const poll = await db.query.polls.findFirst({
      where: eq(polls.slug, slug),
    });

    if (!poll) {
      return jsonError('No poll at this link. It may have been deleted.', 404, 'POLL_NOT_FOUND');
    }

    // Server-side close time enforcement (§2.6)
    const now = new Date();
    if (poll.closedAt || (poll.closesAt && now > poll.closesAt)) {
      return jsonError('This poll closed before your vote was counted.', 400, 'POLL_CLOSED');
    }

    // Validate choices against options
    const pollOptions = await db.query.options.findMany({
      where: eq(options.pollId, poll.id),
      orderBy: (o, { asc }) => [asc(o.position)],
    });
    const validOptionIds = new Set(pollOptions.map((o) => o.id));

    for (const optId of choice) {
      if (!validOptionIds.has(optId)) {
        return jsonError(`Invalid option ID: ${optId}`, 422, 'INVALID_OPTION');
      }
    }

    // Validate kind constraints
    if (poll.kind === 'single' && choice.length !== 1) {
      return jsonError('Single-choice polls require exactly one selection', 422, 'INVALID_CHOICE_COUNT');
    }
    if (poll.kind === 'multi') {
      if (choice.length < 1) {
        return jsonError('At least one option must be chosen', 422, 'INVALID_CHOICE_COUNT');
      }
      if (poll.maxChoices && choice.length > poll.maxChoices) {
        return jsonError(`You may select at most ${poll.maxChoices} choices`, 422, 'MAX_CHOICES_EXCEEDED');
      }
    }
    if (poll.kind === 'ranked') {
      // Check for duplicate choices in ranked list
      const uniqueChoices = new Set(choice);
      if (uniqueChoices.size !== choice.length) {
        return jsonError('Ranked choices must not contain duplicates', 422, 'DUPLICATE_CHOICE');
      }
    }

    const ballotTokenHash = sha256(ballotToken);
    const ip = getClientIp(req);
    const ua = getUserAgent(req);
    const ipHash = computeIpHash(ip, poll.id);
    const uaHash = computeUaHash(ua, poll.id);

    // Atomic transaction for ballot insertion/revision and tally update
    const result = await db.transaction(async (tx) => {
      const existing = await tx.query.ballots.findFirst({
        where: and(eq(ballots.pollId, poll.id), eq(ballots.ballotTokenHash, ballotTokenHash)),
      });

      if (existing) {
        // Idempotency check: if already voted and same choices, return existing result without modifying tally
        const existingChoices = existing.choice as string[];
        const choicesIdentical =
          existingChoices.length === choice.length &&
          existingChoices.every((val, idx) => val === choice[idx]);

        if (choicesIdentical) {
          return {
            receiptCode: existing.receiptCode,
            castAt: existing.castAt.toISOString(),
            revised: false,
          };
        }

        // If choices differ but revisions are not allowed
        if (!poll.allowRevision) {
          return {
            receiptCode: existing.receiptCode,
            castAt: existing.castAt.toISOString(),
            revised: false,
          };
        }

        // Revision allowed: adjust tallies
        // For single/multi: decrement old, increment new
        // For ranked: 1st preference is tracked in tallies
        const oldTallyIds = poll.kind === 'ranked' ? [existingChoices[0]] : existingChoices;
        const newTallyIds = poll.kind === 'ranked' ? [choice[0]] : choice;

        for (const oldId of oldTallyIds) {
          await tx
            .update(tallies)
            .set({
              count: sql`GREATEST(0, ${tallies.count} - 1)`,
              updatedAt: new Date(),
            })
            .where(and(eq(tallies.pollId, poll.id), eq(tallies.optionId, oldId)));
        }

        for (const newId of newTallyIds) {
          await tx
            .update(tallies)
            .set({
              count: sql`${tallies.count} + 1`,
              updatedAt: new Date(),
            })
            .where(and(eq(tallies.pollId, poll.id), eq(tallies.optionId, newId)));
        }

        // Update ballot row
        const [updatedBallot] = await tx
          .update(ballots)
          .set({
            choice,
            revisedAt: new Date(),
            ipHash,
            uaHash,
          })
          .where(eq(ballots.id, existing.id))
          .returning();

        // If ranked, re-tabulate IRV
        if (poll.kind === 'ranked') {
          const allBallots = await tx.query.ballots.findMany({
            where: eq(ballots.pollId, poll.id),
          });
          const candidateLabels: Record<string, string> = {};
          for (const opt of pollOptions) {
            candidateLabels[opt.id] = opt.label;
          }
          const irvResult = tabulateIRV(
            pollOptions.map((o) => o.id),
            allBallots.map((b) => ({ choice: b.choice as string[] })),
            candidateLabels
          );
          await tx
            .insert(pollResults)
            .values({
              pollId: poll.id,
              payload: irvResult,
              computedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: pollResults.pollId,
              set: { payload: irvResult, computedAt: new Date() },
            });
        }

        return {
          receiptCode: updatedBallot.receiptCode,
          castAt: updatedBallot.castAt.toISOString(),
          revised: true,
        };
      }

      // New ballot
      let receiptCode = generateReceiptCode();
      const existingReceipt = await tx.query.ballots.findFirst({
        where: and(eq(ballots.pollId, poll.id), eq(ballots.receiptCode, receiptCode)),
      });
      if (existingReceipt) {
        receiptCode = generateReceiptCode();
      }

      const [newBallot] = await tx
        .insert(ballots)
        .values({
          pollId: poll.id,
          ballotTokenHash,
          choice,
          receiptCode,
          ipHash,
          uaHash,
        })
        .returning();

      // Increment tallies
      const tallyTargets = poll.kind === 'ranked' ? [choice[0]] : choice;
      for (const targetId of tallyTargets) {
        await tx
          .update(tallies)
          .set({
            count: sql`${tallies.count} + 1`,
            updatedAt: new Date(),
          })
          .where(and(eq(tallies.pollId, poll.id), eq(tallies.optionId, targetId)));
      }

      // If ranked, recompute IRV
      if (poll.kind === 'ranked') {
        const allBallots = await tx.query.ballots.findMany({
          where: eq(ballots.pollId, poll.id),
        });
        const candidateLabels: Record<string, string> = {};
        for (const opt of pollOptions) {
          candidateLabels[opt.id] = opt.label;
        }
        const irvResult = tabulateIRV(
          pollOptions.map((o) => o.id),
          allBallots.map((b) => ({ choice: b.choice as string[] })),
          candidateLabels
        );
        await tx
          .insert(pollResults)
          .values({
            pollId: poll.id,
            payload: irvResult,
            computedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: pollResults.pollId,
            set: { payload: irvResult, computedAt: new Date() },
          });
      }

      return {
        receiptCode: newBallot.receiptCode,
        castAt: newBallot.castAt.toISOString(),
        revised: false,
      };
    });

    const response = NextResponse.json(result, { status: 200 });

    // Set HttpOnly cookie for web client
    response.cookies.set(`psepho_ballot_${slug}`, ballotToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: `/`,
      maxAge: 365 * 24 * 3600,
    });

    return response;
  } catch (err) {
    console.error('Error casting ballot:', err);
    return jsonError('Failed to cast ballot', 500);
  }
}
