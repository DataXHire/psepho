import React from 'react';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { polls, options, tallies, pollResults } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Header } from '@/components/Header';
import { PollResultsClient } from './PollResultsClient';
import { PollTallyResult } from '@psepho/core';

export default async function PollResultsPage(props: { params: Promise<{ slug: string }> }) {
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

  const tallyRows = await db.query.tallies.findMany({
    where: eq(tallies.pollId, poll.id),
  });

  let totalVotes = 0;
  const countMap = new Map<string, number>();
  for (const t of tallyRows) {
    totalVotes += t.count;
    countMap.set(t.optionId, t.count);
  }

  const isClosed =
    poll.closedAt !== null || (poll.closesAt !== null && new Date() > new Date(poll.closesAt));

  const isHidden = poll.visibility === 'after_close' && !isClosed;

  let optionTallies = null;
  let irvPayload = null;

  if (!isHidden) {
    optionTallies = pollOptions.map((opt) => {
      const count = countMap.get(opt.id) || 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0;
      return {
        optionId: opt.id,
        count,
        percentage,
      };
    });

    if (poll.kind === 'ranked') {
      const res = await db.query.pollResults.findFirst({
        where: eq(pollResults.pollId, poll.id),
      });
      irvPayload = res?.payload || null;
    }
  }

  const initialTally: PollTallyResult = {
    totalBallots: totalVotes,
    tallies: optionTallies,
    visibility: poll.visibility as any,
    isHidden,
    closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
    updatedAt: new Date().toISOString(),
    irvResult: irvPayload as any,
  };

  return (
    <>
      <Header />
      <PollResultsClient
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
        initialTally={initialTally}
      />
    </>
  );
}
