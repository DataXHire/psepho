import { NextRequest, NextResponse } from 'next/server';
import { db, sha256 } from '@/lib/db';
import { polls, options, ballots } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getCreatorTokenFromRequest, jsonError } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const url = new URL(req.url);
    const tokenQuery = url.searchParams.get('token');
    const creatorToken = getCreatorTokenFromRequest(req) || tokenQuery;

    if (!creatorToken) {
      return jsonError('Creator token required', 401, 'UNAUTHORIZED');
    }

    const poll = await db.query.polls.findFirst({
      where: eq(polls.slug, slug),
    });

    if (!poll) {
      return jsonError('Poll not found', 404);
    }

    if (poll.creatorTokenHash !== sha256(creatorToken)) {
      return jsonError('Invalid creator token', 403, 'FORBIDDEN');
    }

    // Get options map
    const pollOptions = await db.query.options.findMany({
      where: eq(options.pollId, poll.id),
      orderBy: (o, { asc }) => [asc(o.position)],
    });
    const labelMap = new Map<string, string>();
    for (const opt of pollOptions) {
      labelMap.set(opt.id, opt.label);
    }

    // Get all ballots (no voter identifiers)
    const pollBallots = await db.query.ballots.findMany({
      where: eq(ballots.pollId, poll.id),
      orderBy: (b, { asc }) => [asc(b.castAt)],
    });

    // Generate CSV
    const rows = ['receipt_code,cast_at,revised_at,choices'];
    for (const b of pollBallots) {
      const choiceIds = b.choice as string[];
      const choiceNames = choiceIds.map((id) => labelMap.get(id) || id).join(' > ');
      // Escape quotes for CSV
      const escapedChoices = `"${choiceNames.replace(/"/g, '""')}"`;
      rows.push(`${b.receiptCode},${b.castAt.toISOString()},${b.revisedAt ? b.revisedAt.toISOString() : ''},${escapedChoices}`);
    }

    const csvContent = rows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="psepho-${slug}-ballots.csv"`,
      },
    });
  } catch (err) {
    console.error('Error exporting CSV:', err);
    return jsonError('Failed to export CSV', 500);
  }
}
