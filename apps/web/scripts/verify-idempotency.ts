import { db } from '../src/lib/db';
import { polls, options, tallies, ballots } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { POST as castBallot } from '../src/app/api/polls/[slug]/ballot/route';
import { NextRequest } from 'next/server';

async function verifyIdempotency() {
  console.log('=== IDEMPOTENCY VERIFICATION ===');
  // Seed poll: "Where should we eat?" (slug: EAT34NOW)
  const slug = 'EAT34NOW';
  const poll = await db.query.polls.findFirst({ where: eq(polls.slug, slug) });
  if (!poll) throw new Error('Poll not found');

  const pollOptions = await db.query.options.findMany({
    where: eq(options.pollId, poll.id),
    orderBy: (o, { asc }) => [asc(o.position)],
  });
  const targetOption = pollOptions[0]; // Mezze Bar

  // 1. Before count
  const tallyBefore = await db.query.tallies.findFirst({
    where: and(eq(tallies.pollId, poll.id), eq(tallies.optionId, targetOption.id)),
  });
  const countBefore = tallyBefore?.count || 0;
  console.log(`Before count for "${targetOption.label}": ${countBefore}`);

  // Fixed ballot token
  const testBallotToken = 'idempotency-token-verify-secret-' + Date.now();

  console.log(`Casting ballot with token: ${testBallotToken}`);
  console.log('Replaying identical request 5 times consecutively...');

  const results: any[] = [];
  for (let i = 1; i <= 5; i++) {
    const req = new NextRequest(`http://localhost:3000/api/polls/${slug}/ballot`, {
      method: 'POST',
      body: JSON.stringify({
        choice: [targetOption.id],
        ballotToken: testBallotToken,
      }),
    });
    const res = await castBallot(req, { params: Promise.resolve({ slug }) });
    const json = await res.json();
    results.push({ attempt: i, status: res.status, receiptCode: json.receiptCode, revised: json.revised });
  }
  console.table(results);

  // 2. After count
  const tallyAfter = await db.query.tallies.findFirst({
    where: and(eq(tallies.pollId, poll.id), eq(tallies.optionId, targetOption.id)),
  });
  const countAfter = tallyAfter?.count || 0;
  console.log(`After count for "${targetOption.label}": ${countAfter}`);
  console.log(`Delta: ${countAfter - countBefore} (Expected: exactly 1)`);
  if (countAfter - countBefore === 1) {
    console.log('✓ Idempotency CONFIRMED: tally incremented by exactly 1 across 5 submissions.');
  } else {
    console.error('✗ Idempotency FAILED!');
    process.exit(1);
  }
}

verifyIdempotency().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
