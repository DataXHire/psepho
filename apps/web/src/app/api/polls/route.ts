import { NextRequest, NextResponse } from 'next/server';
import { CreatePollSchema, generateSlug } from '@psepho/core';
import { db, sha256 } from '@/lib/db';
import { polls, options, tallies } from '@/lib/db/schema';
import { jsonError } from '@/lib/api-helpers';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreatePollSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('Invalid poll data', 422, 'VALIDATION_ERROR', parsed.error.format());
    }

    const input = parsed.data;

    // Generate unique slug
    let slug = generateSlug();
    // Ensure slug doesn't collide
    const existing = await db.query.polls.findFirst({
      where: (p, { eq }) => eq(p.slug, slug),
    });
    if (existing) {
      slug = generateSlug();
    }

    // Generate creator secret token (64 hex characters)
    const creatorToken = crypto.randomBytes(32).toString('hex');
    const creatorTokenHash = sha256(creatorToken);

    // Closes at calculation
    let closesAt: Date | null = null;
    if (input.closesAt) {
      closesAt = new Date(input.closesAt);
    } else if (input.closesInHours) {
      closesAt = new Date(Date.now() + input.closesInHours * 3600 * 1000);
    }

    const result = await db.transaction(async (tx) => {
      const [newPoll] = await tx
        .insert(polls)
        .values({
          slug,
          question: input.question,
          kind: input.kind,
          maxChoices: input.maxChoices || null,
          integrity: input.integrity,
          visibility: input.visibility,
          allowRevision: input.allowRevision,
          closesAt,
          creatorTokenHash,
        })
        .returning();

      // Insert options
      const optionRows = input.options.map((optLabel, idx) => ({
        pollId: newPoll.id,
        position: idx,
        label: optLabel,
      }));

      const createdOptions = await tx.insert(options).values(optionRows).returning();

      // Initialize tallies for all options at 0
      const tallyRows = createdOptions.map((opt) => ({
        pollId: newPoll.id,
        optionId: opt.id,
        count: 0,
      }));

      await tx.insert(tallies).values(tallyRows);

      return { newPoll, createdOptions };
    });

    return NextResponse.json(
      {
        slug: result.newPoll.slug,
        creatorToken,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating poll:', err);
    return jsonError('Failed to create poll', 500);
  }
}
