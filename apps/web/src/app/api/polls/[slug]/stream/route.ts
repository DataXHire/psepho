import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { polls, options, tallies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  const poll = await db.query.polls.findFirst({
    where: eq(polls.slug, slug),
  });

  if (!poll) {
    return new Response('Poll not found', { status: 404 });
  }

  let isClosed = false;

  const responseStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      async function fetchCurrentTally() {
        const currentPoll = await db.query.polls.findFirst({
          where: eq(polls.id, poll!.id),
        });
        const pollOptions = await db.query.options.findMany({
          where: eq(options.pollId, poll!.id),
          orderBy: (o, { asc }) => [asc(o.position)],
        });
        const tallyRows = await db.query.tallies.findMany({
          where: eq(tallies.pollId, poll!.id),
        });

        let totalVotes = 0;
        const countMap = new Map<string, number>();
        let latestUpdated = currentPoll?.createdAt || new Date();

        for (const t of tallyRows) {
          totalVotes += t.count;
          countMap.set(t.optionId, t.count);
          if (t.updatedAt > latestUpdated) {
            latestUpdated = t.updatedAt;
          }
        }

        const optionList = pollOptions.map((opt) => {
          const count = countMap.get(opt.id) || 0;
          return {
            optionId: opt.id,
            count,
            percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 1000) / 10 : 0,
          };
        });

        return {
          totalBallots: totalVotes,
          tallies: optionList,
          closedAt: currentPoll?.closedAt?.toISOString() || null,
          updatedAt: latestUpdated.toISOString(),
        };
      }

      let eventIndex = 1;

      // Send initial state
      try {
        const initialTally = await fetchCurrentTally();
        controller.enqueue(
          encoder.encode(`id: ${eventIndex++}\ndata: ${JSON.stringify(initialTally)}\n\n`)
        );
      } catch (err) {
        console.error('Error sending initial SSE event:', err);
      }

      // Interval checking for changes + heartbeat every 15s
      let lastHeartbeat = Date.now();
      const interval = setInterval(async () => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }

        try {
          const now = Date.now();
          if (now - lastHeartbeat >= 15000) {
            // Send heartbeat comment
            controller.enqueue(encoder.encode(`: heartbeat\n\n`));
            lastHeartbeat = now;
          }

          const tally = await fetchCurrentTally();
          controller.enqueue(
            encoder.encode(`id: ${eventIndex++}\ndata: ${JSON.stringify(tally)}\n\n`)
          );
        } catch (err) {
          console.error('SSE interval error:', err);
        }
      }, 3000);

      req.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
