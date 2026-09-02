import React from 'react';
import Link from 'next/link';
import { db, sha256 } from '@/lib/db';
import { polls, options, ballots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { Header } from '@/components/Header';
import { PollVoteClient } from '@/app/p/[slug]/PollVoteClient';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  // Load the seeded poll: "Where should we eat?" (slug: EAT34NOW)
  let poll = await db.query.polls.findFirst({
    where: eq(polls.slug, 'EAT34NOW'),
  });

  if (!poll) {
    // Fallback to any active poll
    poll = await db.query.polls.findFirst({
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });
  }

  let pollOptions: any[] = [];
  let initialBallot = null;

  if (poll) {
    pollOptions = await db.query.options.findMany({
      where: eq(options.pollId, poll.id),
      orderBy: (o, { asc }) => [asc(o.position)],
    });

    const cookieStore = await cookies();
    const ballotCookie = cookieStore.get(`psepho_ballot_${poll.slug}`);
    if (ballotCookie?.value) {
      const tokenHash = sha256(ballotCookie.value);
      const existing = await db.query.ballots.findFirst({
        where: and(eq(ballots.pollId, poll.id), eq(ballots.ballotTokenHash, tokenHash)),
      });
      if (existing) {
        initialBallot = {
          choice: existing.choice as string[],
          receiptCode: existing.receiptCode,
          castAt: existing.castAt.toISOString(),
          revisedAt: existing.revisedAt ? existing.revisedAt.toISOString() : null,
        };
      }
    }
  }

  return (
    <>
      <Header />
      <div className="pt-2">
        {/* The Hero is a working poll above the fold (§1.5) */}
        {poll && (
          <PollVoteClient
            initialPoll={{
              ...poll,
              opensAt: poll.opensAt.toISOString(),
              closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
              closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
              createdAt: poll.createdAt.toISOString(),
              kind: poll.kind as any,
              integrity: poll.integrity as any,
              visibility: poll.visibility as any,
            }}
            initialOptions={pollOptions.map((o) => ({
              id: o.id,
              pollId: o.pollId,
              position: o.position,
              label: o.label,
            }))}
            initialBallot={initialBallot}
          />
        )}

        {/* Below it: one line of what this is, and primary action: Create a poll */}
        <div className="w-full max-w-ballot mx-auto px-4 pb-20 -mt-12 space-y-6">
          <p className="text-sm text-slate font-body">
            Create a poll in ten seconds, share a link, and get a result the people who voted can verify.
          </p>

          <div>
            <Link
              href="/new"
              className="inline-block py-3 px-6 bg-patina text-surface rounded-interactive font-ui-semibold text-sm hover:bg-patina-deep transition-colors"
            >
              Create a poll
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
