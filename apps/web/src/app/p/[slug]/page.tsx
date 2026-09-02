import React from 'react';
import { notFound } from 'next/navigation';
import { db, sha256 } from '@/lib/db';
import { polls, options, ballots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { Header } from '@/components/Header';
import { PollVoteClient } from './PollVoteClient';

export default async function PollPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const poll = await db.query.polls.findFirst({
    where: eq(polls.slug, slug),
  });

  if (!poll) {
    notFound();
  }

  const pollOptions = await db.query.options.findMany({
    where: eq(options.pollId, poll.id),
    orderBy: (o, { asc }) => [asc(o.position)],
  });

  // Check cookie for existing ballot
  const cookieStore = await cookies();
  const ballotCookie = cookieStore.get(`psepho_ballot_${slug}`);
  let initialBallot = null;

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

  return (
    <>
      <Header />
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
    </>
  );
}
