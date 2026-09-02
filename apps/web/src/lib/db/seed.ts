import { db, pool, sha256 } from './index';
import { polls, options, tallies, ballots, pollResults } from './schema';
import { generateReceiptCode, tabulateIRV } from '@psepho/core';

export async function seedDatabase() {
  console.log('Seeding psepho database with 4 example polls...');

  // 1. Single-choice open poll: "Where should we eat?"
  const slug1 = 'EAT34NOW';
  const creatorSecret1 = 'creator-secret-eat-restaurant-1';
  const [poll1] = await db
    .insert(polls)
    .values({
      slug: slug1,
      question: 'Where should we eat?',
      kind: 'single',
      integrity: 'open',
      visibility: 'always',
      allowRevision: true,
      creatorTokenHash: sha256(creatorSecret1),
    })
    .onConflictDoNothing()
    .returning();

  if (poll1) {
    const opts1 = await db
      .insert(options)
      .values([
        { pollId: poll1.id, position: 0, label: 'Mezze Bar' },
        { pollId: poll1.id, position: 1, label: 'Szechuan Noodle House' },
        { pollId: poll1.id, position: 2, label: 'Taqueria El Sol' },
      ])
      .returning();

    // Tallies: Mezze 4, Szechuan 8, Taqueria 3
    await db.insert(tallies).values([
      { pollId: poll1.id, optionId: opts1[0].id, count: 4 },
      { pollId: poll1.id, optionId: opts1[1].id, count: 8 },
      { pollId: poll1.id, optionId: opts1[2].id, count: 3 },
    ]);

    // Sample ballot with known receipt
    await db.insert(ballots).values({
      pollId: poll1.id,
      ballotTokenHash: sha256('sample-voter-secret-1'),
      choice: [opts1[1].id], // Szechuan
      receiptCode: '7K2M9Q', // Quoted receipt from spec §1.5
    });
  }

  // 2. Multiple-choice device poll: "Which days work best for the all-hands meeting?"
  const slug2 = 'MEET2DAY';
  const creatorSecret2 = 'creator-secret-meeting-schedule-2';
  const [poll2] = await db
    .insert(polls)
    .values({
      slug: slug2,
      question: 'Which days work best for the all-hands meeting?',
      kind: 'multi',
      maxChoices: 2,
      integrity: 'device',
      visibility: 'after_vote',
      allowRevision: true,
      creatorTokenHash: sha256(creatorSecret2),
    })
    .onConflictDoNothing()
    .returning();

  if (poll2) {
    const opts2 = await db
      .insert(options)
      .values([
        { pollId: poll2.id, position: 0, label: 'Tuesday morning' },
        { pollId: poll2.id, position: 1, label: 'Wednesday afternoon' },
        { pollId: poll2.id, position: 2, label: 'Thursday morning' },
        { pollId: poll2.id, position: 3, label: 'Friday lunchtime' },
      ])
      .returning();

    await db.insert(tallies).values([
      { pollId: poll2.id, optionId: opts2[0].id, count: 12 },
      { pollId: poll2.id, optionId: opts2[1].id, count: 19 },
      { pollId: poll2.id, optionId: opts2[2].id, count: 14 },
      { pollId: poll2.id, optionId: opts2[3].id, count: 5 },
    ]);
  }

  // 3. Ranked-choice poll: "How should our city prioritize transit investment?"
  const slug3 = 'TRANS1T8';
  const creatorSecret3 = 'creator-secret-transit-priorities-3';
  const [poll3] = await db
    .insert(polls)
    .values({
      slug: slug3,
      question: 'How should our city prioritize transit investment?',
      kind: 'ranked',
      integrity: 'device',
      visibility: 'always',
      allowRevision: true,
      creatorTokenHash: sha256(creatorSecret3),
    })
    .onConflictDoNothing()
    .returning();

  if (poll3) {
    const opts3 = await db
      .insert(options)
      .values([
        { pollId: poll3.id, position: 0, label: 'Cycling infrastructure' },
        { pollId: poll3.id, position: 1, label: 'Walking & pedestrian corridors' },
        { pollId: poll3.id, position: 2, label: 'Bus rapid transit' },
        { pollId: poll3.id, position: 3, label: 'Suburban rail upgrades' },
      ])
      .returning();

    const cycling = opts3[0].id;
    const walking = opts3[1].id;
    const bus = opts3[2].id;
    const rail = opts3[3].id;

    // Simulate round 1 leader losing scenario or realistic IRV
    const sampleBallots = [
      { choice: [cycling, walking, bus] },
      { choice: [cycling, bus, walking] },
      { choice: [cycling, walking] },
      { choice: [walking, cycling, bus] },
      { choice: [walking, bus, rail] },
      { choice: [walking, cycling] },
      { choice: [walking, rail] },
      { choice: [bus, walking, cycling] },
      { choice: [bus, rail, walking] },
      { choice: [rail, walking, bus] },
    ];

    for (let i = 0; i < sampleBallots.length; i++) {
      await db.insert(ballots).values({
        pollId: poll3.id,
        ballotTokenHash: sha256(`voter-token-transit-${i}`),
        choice: sampleBallots[i].choice,
        receiptCode: generateReceiptCode(),
      });
    }

    // Tallies store 1st preferences initially
    await db.insert(tallies).values([
      { pollId: poll3.id, optionId: cycling, count: 3 },
      { pollId: poll3.id, optionId: walking, count: 4 },
      { pollId: poll3.id, optionId: bus, count: 2 },
      { pollId: poll3.id, optionId: rail, count: 1 },
    ]);

    // Compute IRV result and cache
    const labelsMap: Record<string, string> = {
      [cycling]: 'Cycling',
      [walking]: 'Walking',
      [bus]: 'Bus',
      [rail]: 'Rail',
    };
    const irvResult = tabulateIRV(
      [cycling, walking, bus, rail],
      sampleBallots,
      labelsMap
    );

    await db.insert(pollResults).values({
      pollId: poll3.id,
      payload: irvResult,
    });
  }

  // 4. Already closed poll: "Should the project adopt the new schema migration tool?"
  const slug4 = 'CL0SED99';
  const creatorSecret4 = 'creator-secret-closed-poll-4';
  const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
  const [poll4] = await db
    .insert(polls)
    .values({
      slug: slug4,
      question: 'Should the project adopt the new schema migration tool?',
      kind: 'single',
      integrity: 'device',
      visibility: 'after_close',
      allowRevision: true,
      closesAt: pastDate,
      closedAt: pastDate,
      creatorTokenHash: sha256(creatorSecret4),
    })
    .onConflictDoNothing()
    .returning();

  if (poll4) {
    const opts4 = await db
      .insert(options)
      .values([
        { pollId: poll4.id, position: 0, label: 'Yes, immediately' },
        { pollId: poll4.id, position: 1, label: 'No, keep current workflow' },
      ])
      .returning();

    await db.insert(tallies).values([
      { pollId: poll4.id, optionId: opts4[0].id, count: 28 },
      { pollId: poll4.id, optionId: opts4[1].id, count: 7 },
    ]);
  }

  console.log('Seeding completed successfully!');
}

if (require.main === module || process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => {
      console.log('Seed done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
