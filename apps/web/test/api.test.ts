import { describe, it, expect, beforeAll } from 'vitest';
import { db, sha256 } from '../src/lib/db';
import { polls, options, tallies, ballots } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest } from 'next/server';
import { POST as createPoll } from '../src/app/api/polls/route';
import { POST as castBallot } from '../src/app/api/polls/[slug]/ballot/route';
import { GET as getTally } from '../src/app/api/polls/[slug]/tally/route';
import { GET as getPoll } from '../src/app/api/polls/[slug]/route';
import { GET as getReceipt } from '../src/app/api/receipts/[code]/route';
import { POST as closePoll } from '../src/app/api/polls/[slug]/close/route';

describe('Psepho API and Integrity Tests', () => {
  let createdSlug: string;
  let creatorToken: string;
  let optionIds: string[] = [];

  beforeAll(async () => {
    // 1. Create a test poll with visibility: after_close
    const req = new NextRequest('http://localhost:3000/api/polls', {
      method: 'POST',
      body: JSON.stringify({
        question: 'Should we schedule the launch for Monday?',
        kind: 'single',
        options: ['Yes, launch Monday', 'No, delay to Wednesday'],
        integrity: 'device',
        visibility: 'after_close',
        allowRevision: true,
      }),
    });

    const res = await createPoll(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    createdSlug = body.slug;
    creatorToken = body.creatorToken;

    // Get option IDs
    const pollRecord = await db.query.polls.findFirst({
      where: eq(polls.slug, createdSlug),
    });
    const opts = await db.query.options.findMany({
      where: eq(options.pollId, pollRecord!.id),
      orderBy: (o, { asc }) => [asc(o.position)],
    });
    optionIds = opts.map((o) => o.id);
  });

  it('verifies after_close leak prevention: breakdown is 100% absent while poll is open', async () => {
    // Cast 1 ballot for option 0
    const ballotReq = new NextRequest(`http://localhost:3000/api/polls/${createdSlug}/ballot`, {
      method: 'POST',
      body: JSON.stringify({
        choice: [optionIds[0]],
        ballotToken: 'voter-secret-leak-test-token-1234',
      }),
    });
    const ballotRes = await castBallot(ballotReq, { params: Promise.resolve({ slug: createdSlug }) });
    expect(ballotRes.status).toBe(200);

    // Call /tally
    const tallyReq = new NextRequest(`http://localhost:3000/api/polls/${createdSlug}/tally`);
    const tallyRes = await getTally(tallyReq, { params: Promise.resolve({ slug: createdSlug }) });
    expect(tallyRes.status).toBe(200);

    const tallyJson = await tallyRes.json();
    // Verify per-option breakdown is completely absent from payload
    expect(tallyJson.tallies).toBeNull();
    expect(tallyJson.isHidden).toBe(true);
    expect(tallyJson.totalBallots).toBe(1);
    expect(tallyJson.visibility).toBe('after_close');
  });

  it('verifies strict idempotency: replaying ballot 5 times increments tally by exactly 1', async () => {
    // Create a fresh open poll with visibility: always
    const req = new NextRequest('http://localhost:3000/api/polls', {
      method: 'POST',
      body: JSON.stringify({
        question: 'Idempotency test poll',
        kind: 'single',
        options: ['Choice Alpha', 'Choice Beta'],
        integrity: 'open',
        visibility: 'always',
      }),
    });
    const res = await createPoll(req);
    const { slug } = await res.json();

    const pollRec = await db.query.polls.findFirst({ where: eq(polls.slug, slug) });
    const opts = await db.query.options.findMany({ where: eq(options.pollId, pollRec!.id) });
    const targetOptionId = opts[0].id;

    // Check count before
    const initialTally = await db.query.tallies.findFirst({
      where: and(eq(tallies.pollId, pollRec!.id), eq(tallies.optionId, targetOptionId)),
    });
    const countBefore = initialTally?.count || 0;

    const fixedBallotToken = 'replayed-ballot-token-unique-secret-999';

    // Submit ballot 5 times consecutively
    let firstReceiptCode = '';
    for (let i = 0; i < 5; i++) {
      const ballotReq = new NextRequest(`http://localhost:3000/api/polls/${slug}/ballot`, {
        method: 'POST',
        body: JSON.stringify({
          choice: [targetOptionId],
          ballotToken: fixedBallotToken,
        }),
      });
      const bRes = await castBallot(ballotReq, { params: Promise.resolve({ slug }) });
      expect(bRes.status).toBe(200);
      const bJson = await bRes.json();
      if (i === 0) {
        firstReceiptCode = bJson.receiptCode;
      } else {
        // Must return identical receipt code
        expect(bJson.receiptCode).toBe(firstReceiptCode);
        expect(bJson.revised).toBe(false);
      }
    }

    // Check count after
    const finalTally = await db.query.tallies.findFirst({
      where: and(eq(tallies.pollId, pollRec!.id), eq(tallies.optionId, targetOptionId)),
    });
    const countAfter = finalTally?.count || 0;

    // Count moved by exactly 1!
    expect(countAfter).toBe(countBefore + 1);

    // Verify ballots table contains exactly 1 ballot for this token
    const ballotCount = await db.query.ballots.findMany({
      where: and(eq(ballots.pollId, pollRec!.id), eq(ballots.ballotTokenHash, sha256(fixedBallotToken))),
    });
    expect(ballotCount.length).toBe(1);
  });

  it('rejects ballot casting after deadline has passed', async () => {
    // Create poll that closed in the past
    const past = new Date(Date.now() - 60000); // 1 min ago
    const expiredSlug = 'EXP' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const [expiredPoll] = await db
      .insert(polls)
      .values({
        slug: expiredSlug,
        question: 'Has the deadline passed?',
        kind: 'single',
        integrity: 'device',
        visibility: 'always',
        closesAt: past,
        creatorTokenHash: sha256('secret'),
      })
      .returning();

    const [expiredOpt] = await db
      .insert(options)
      .values([{ pollId: expiredPoll.id, position: 0, label: 'Yes' }])
      .returning();

    const ballotReq = new NextRequest(`http://localhost:3000/api/polls/${expiredSlug}/ballot`, {
      method: 'POST',
      body: JSON.stringify({
        choice: [expiredOpt.id],
        ballotToken: 'token-for-expired-poll-' + Date.now(),
      }),
    });

    const ballotRes = await castBallot(ballotReq, { params: Promise.resolve({ slug: expiredSlug }) });
    expect(ballotRes.status).toBe(400);
    const json = await ballotRes.json();
    expect(json.error).toBe('This poll closed before your vote was counted.');
    expect(json.code).toBe('POLL_CLOSED');
  });

  it('allows creator to close poll and reveals after_close results', async () => {
    // Close created poll
    const closeReq = new NextRequest(`http://localhost:3000/api/polls/${createdSlug}/close`, {
      method: 'POST',
      headers: {
        'x-creator-token': creatorToken,
      },
      body: JSON.stringify({ creatorToken }),
    });
    const closeRes = await closePoll(closeReq, { params: Promise.resolve({ slug: createdSlug }) });
    expect(closeRes.status).toBe(200);

    // Now call /tally - since closed, breakdown must be revealed
    const tallyReq = new NextRequest(`http://localhost:3000/api/polls/${createdSlug}/tally`);
    const tallyRes = await getTally(tallyReq, { params: Promise.resolve({ slug: createdSlug }) });
    const tallyJson = await tallyRes.json();
    expect(tallyJson.isHidden).toBe(false);
    expect(tallyJson.tallies).not.toBeNull();
    expect(tallyJson.tallies.length).toBe(2);
  });

  it('looks up cryptographic receipt code accurately', async () => {
    // 7K2M9Q was seeded in seed.ts for "Where should we eat?"
    const receiptReq = new NextRequest('http://localhost:3000/api/receipts/7K2M9Q');
    const receiptRes = await getReceipt(receiptReq, { params: Promise.resolve({ code: '7K2M9Q' }) });
    expect(receiptRes.status).toBe(200);
    const json = await receiptRes.json();
    expect(json.found).toBe(true);
    expect(json.question).toBe('Where should we eat?');
    expect(json.optionLabel).toContain('Szechuan Noodle House');
  });
});
