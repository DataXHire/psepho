'use client';

import React, { useState, useEffect, use } from 'react';
import QRCode from 'qrcode';
import { PollTallyResult, calculatePollDenomination } from '@psepho/core';
import { PebbleTally } from '@/components/PebbleTally';
import { getOptionColor, getOptionLetter } from '@psepho/tokens';

export default function RoomPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = use(props.params);

  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<any[]>([]);
  const [tally, setTally] = useState<PollTallyResult | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // 1. Fetch initial poll and options
  useEffect(() => {
    async function loadPoll() {
      try {
        const res = await fetch(`/api/polls/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setPoll(data.poll);
          setOptions(data.options);
        }
      } catch (err) {
        console.error('Failed to load room poll:', err);
      }
    }
    loadPoll();

    // Generate QR code for mobile audience
    const voteUrl = `${window.location.origin}/p/${slug}`;
    QRCode.toDataURL(voteUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#14171A',
        light: '#FAFBFA',
      },
    }).then(setQrCodeUrl);
  }, [slug]);

  // 2. Connect via Server-Sent Events (SSE) (§2.5)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connectSSE() {
      eventSource = new EventSource(`/api/polls/${slug}/stream`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTally((prev) => ({
            ...prev,
            ...data,
          }));
        } catch (err) {
          // ignore heartbeat / comments
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        // Assume connection dies every few minutes and treat as normal; reconnect automatically (§2.5)
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [slug]);

  const countMap = new Map<string, { count: number; percentage: number }>();
  let maxVotes = 0;
  if (tally?.tallies) {
    for (const t of tally.tallies) {
      countMap.set(t.optionId, { count: t.count, percentage: t.percentage });
      if (t.count > maxVotes) maxVotes = t.count;
    }
  }
  const denomination = calculatePollDenomination(maxVotes);

  if (!poll) {
    return <div className="p-8 text-slate">Loading room presentation...</div>;
  }

  return (
    <div className="min-h-screen bg-paper text-ink p-8 md:p-16 flex flex-col justify-between select-none">
      {/* Top Header / Question at 48px */}
      <header className="max-w-5xl">
        <span className="text-xs uppercase tracking-widest text-patina font-semibold block mb-3">
          Live Room Presentation · {poll.kind} choice
        </span>
        <h1 className="font-display text-4xl md:text-[48px] text-ink leading-tight tracking-tight">
          {poll.question}
        </h1>
      </header>

      {/* Main Options List at 27px */}
      <main className="max-w-4xl my-10 space-y-4">
        {options.map((opt) => {
          const stats = countMap.get(opt.id) || { count: 0, percentage: 0 };
          const colorObj = getOptionColor(opt.position);
          const letter = getOptionLetter(opt.position);

          return (
            <div
              key={opt.id}
              className="relative p-4 bg-surface border border-rule rounded-row overflow-hidden"
            >
              {/* Proportional background share fill */}
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500 ease-out pointer-events-none"
                style={{
                  width: `${Math.min(100, stats.percentage)}%`,
                  backgroundColor: colorObj.hex,
                  opacity: 0.14,
                }}
              />

              <div className="relative z-10 flex items-baseline justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-row"
                    style={{
                      backgroundColor: `${colorObj.hex}22`,
                      color: colorObj.hex,
                    }}
                  >
                    {letter}
                  </span>
                  <span className="font-display text-xl md:text-[27px] text-ink">
                    {opt.label}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 tabular-nums font-semibold text-ink text-xl md:text-2xl">
                  <span>{stats.count}</span>
                  <span className="text-sm font-normal text-slate">
                    ({stats.percentage}%)
                  </span>
                </div>
              </div>

              {/* Physical pebble tally representation */}
              <div className="relative z-10 mt-3">
                <PebbleTally
                  votes={stats.count}
                  color={colorObj.hex}
                  denomination={denomination}
                  percentage={stats.percentage}
                />
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer with pinned bottom-right QR Code for audience */}
      <footer className="flex items-end justify-between border-t border-rule pt-6 text-xs text-slate">
        <div className="space-y-1">
          <p>
            Total votes cast: <span className="tabular-nums font-semibold text-ink">{tally?.totalBallots || 0}</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-patina' : 'bg-alarm'
              }`}
            />
            {isConnected ? 'Realtime stream active' : 'Connecting stream...'}
          </p>
        </div>

        {/* Pinned QR Code */}
        {qrCodeUrl && (
          <div className="flex items-center gap-3 bg-surface p-3 border border-rule rounded-sheet">
            <div className="text-right">
              <span className="block font-semibold text-ink text-xs">Join & Vote</span>
              <span className="text-[11px] text-slate font-mono">/p/{slug}</span>
            </div>
            <img
              src={qrCodeUrl}
              alt="Scan to vote"
              className="w-20 h-20 rounded-row border border-rule"
            />
          </div>
        )}
      </footer>
    </div>
  );
}
