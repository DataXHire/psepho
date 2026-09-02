'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Header } from '@/components/Header';
import { PollKind, IntegrityLevel, VisibilityMode } from '@psepho/core';
import { PsephoClient } from '@psepho/api-client';

export default function CreatePollPage() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [activeSheet, setActiveSheet] = useState<'integrity' | 'close' | 'visibility' | 'kind' | null>(null);

  // Settings sentence defaults
  const [kind, setKind] = useState<PollKind>('single');
  const [maxChoices, setMaxChoices] = useState<number | null>(null);
  const [integrity, setIntegrity] = useState<IntegrityLevel>('device');
  const [closesInHours, setClosesInHours] = useState<number>(24);
  const [visibility, setVisibility] = useState<VisibilityMode>('after_close');

  // Creation & Share state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createdPoll, setCreatedPoll] = useState<{ slug: string; creatorToken: string } | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);

  const optionInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus question field on load
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    questionInputRef.current?.focus();
  }, []);

  // Generate QR code when poll is published
  useEffect(() => {
    if (createdPoll?.slug) {
      const pollUrl = `${window.location.origin}/p/${createdPoll.slug}`;
      QRCode.toDataURL(pollUrl, {
        width: 240,
        margin: 1,
        color: {
          dark: '#14171A',
          light: '#FAFBFA',
        },
      }).then(setQrCodeDataUrl);
    }
  }, [createdPoll?.slug]);

  // Handle option keydown (Enter commits & creates next, Backspace on empty deletes)
  const handleOptionKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (options.length < 20) {
        const next = [...options];
        next.splice(index + 1, 0, '');
        setOptions(next);
        setTimeout(() => {
          optionInputRefs.current[index + 1]?.focus();
        }, 0);
      }
    } else if (e.key === 'Backspace' && options[index] === '' && options.length > 2) {
      e.preventDefault();
      const next = options.filter((_, i) => i !== index);
      setOptions(next);
      const prevIndex = Math.max(0, index - 1);
      setTimeout(() => {
        optionInputRefs.current[prevIndex]?.focus();
      }, 0);
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const next = [...options];
    next[index] = val;
    setOptions(next);
  };

  const handlePublish = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setErrorMessage('Question is required');
      questionInputRef.current?.focus();
      return;
    }

    const filteredOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filteredOptions.length < 2) {
      setErrorMessage('Minimum 2 options required');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const client = new PsephoClient();
      const res = await client.createPoll({
        question: trimmedQuestion,
        kind,
        maxChoices: kind === 'multi' ? maxChoices : null,
        options: filteredOptions,
        integrity,
        closesInHours,
        visibility,
        allowRevision: true,
      });

      // Save creator token to localStorage so "Mine" tab / manage works
      try {
        const stored = JSON.parse(localStorage.getItem('psepho_creator_tokens') || '{}');
        stored[res.slug] = res.creatorToken;
        localStorage.setItem('psepho_creator_tokens', JSON.stringify(stored));
      } catch {
        // ignore
      }

      setToastMessage('Published');
      setCreatedPoll(res);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to publish poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyShareLink = () => {
    if (!createdPoll) return;
    const url = `${window.location.origin}/p/${createdPoll.slug}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Editable settings sentence labels
  const integrityLabel =
    integrity === 'device' ? 'One vote per device' : 'Open poll';

  const closeLabel =
    closesInHours === 1
      ? 'closes in 1 hour'
      : closesInHours === 24
      ? 'closes in 24 hours'
      : closesInHours === 72
      ? 'closes in 3 days'
      : 'closes in 7 days';

  const visibilityLabel =
    visibility === 'after_close'
      ? 'results after close'
      : visibility === 'after_vote'
      ? 'results after you vote'
      : 'results always live';

  return (
    <>
      <Header />
      <main className="w-full max-w-ballot mx-auto px-4 pb-24 pt-6">
        {/* Toast notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-ink text-surface rounded-interactive text-xs font-semibold shadow-none">
            {toastMessage}
          </div>
        )}

        {/* Share surface in place (§1.5) */}
        {createdPoll ? (
          <div className="space-y-8">
            <div>
              <span className="text-xs uppercase tracking-wide text-patina font-semibold block mb-2">
                Poll Published
              </span>
              <h1 className="font-display text-3xl text-ink tracking-tight">
                {question}
              </h1>
            </div>

            {/* Link Copy Box */}
            <div className="p-4 bg-surface border border-rule rounded-row space-y-3">
              <span className="text-xs text-slate block font-medium">Share link</span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/p/${createdPoll.slug}` : ''}
                  className="w-full bg-paper border border-rule px-3 py-2 text-xs font-mono text-ink rounded-row select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  className="px-4 py-2 bg-ink text-surface rounded-interactive text-xs font-semibold whitespace-nowrap hover:opacity-90"
                >
                  {linkCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div className="p-4 bg-surface border border-rule rounded-row flex flex-col items-center justify-center space-y-3">
                <span className="text-xs text-slate block font-medium">QR Code for Room / Mobile</span>
                <img
                  src={qrCodeDataUrl}
                  alt="Poll QR Code"
                  className="w-48 h-48 border border-rule rounded-row"
                />
              </div>
            )}

            {/* Primary Action: Open Poll */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href={`/p/${createdPoll.slug}`}
                className="flex-1 text-center py-3 px-4 bg-patina text-surface rounded-interactive font-ui-semibold text-sm hover:bg-patina-deep transition-colors"
              >
                Open poll
              </Link>
              <Link
                href={`/p/${createdPoll.slug}/manage?token=${createdPoll.creatorToken}`}
                className="py-3 px-4 bg-surface border border-rule text-ink rounded-interactive font-ui-semibold text-sm hover:border-slate text-center transition-colors"
              >
                Creator manage
              </Link>
            </div>
          </div>
        ) : (
          /* Create Form */
          <div className="space-y-6">
            {errorMessage && (
              <div className="p-3 border border-alarm/30 bg-surface rounded-row text-xs text-alarm">
                {errorMessage}
              </div>
            )}

            {/* Question Field (Display Face at 27px) */}
            <div>
              <textarea
                ref={questionInputRef}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                rows={2}
                className="w-full bg-transparent border-none p-0 font-display text-[27px] text-ink placeholder:text-rule focus:outline-none resize-none"
              />
            </div>

            {/* Option Inputs */}
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-5 text-xs text-slate font-medium text-right tabular-nums">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <input
                    ref={(el) => {
                      optionInputRefs.current[idx] = el;
                    }}
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOptionKeyDown(idx, e)}
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    className="w-full bg-surface border border-rule px-3 py-2.5 rounded-row text-sm text-ink placeholder:text-slate/60 focus:border-ink focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-slate">
              Press Enter to add another option. Backspace on empty to delete. (Min 2, max 20)
            </p>

            {/* Settings Sentence (§1.5) */}
            <div className="pt-4 border-t border-rule">
              <p className="text-xs text-slate font-body leading-relaxed">
                <button
                  type="button"
                  onClick={() => setActiveSheet('integrity')}
                  className="hover:text-ink underline decoration-rule hover:decoration-slate text-slate transition-colors"
                >
                  {integrityLabel}
                </button>
                {' · '}
                <button
                  type="button"
                  onClick={() => setActiveSheet('close')}
                  className="hover:text-ink underline decoration-rule hover:decoration-slate text-slate transition-colors"
                >
                  {closeLabel}
                </button>
                {' · '}
                <button
                  type="button"
                  onClick={() => setActiveSheet('visibility')}
                  className="hover:text-ink underline decoration-rule hover:decoration-slate text-slate transition-colors"
                >
                  {visibilityLabel}
                </button>
                {' · '}
                <button
                  type="button"
                  onClick={() => setActiveSheet('kind')}
                  className="hover:text-ink underline decoration-rule hover:decoration-slate text-slate transition-colors"
                >
                  {kind === 'single' ? 'single choice' : kind === 'multi' ? 'multiple choice' : 'ranked choice'}
                </button>
              </p>
            </div>

            {/* Publish Poll Primary Button */}
            <div className="pt-6">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePublish}
                className="w-full py-3 px-4 bg-patina text-surface rounded-interactive font-ui-semibold text-sm hover:bg-patina-deep disabled:opacity-40 transition-colors"
              >
                {isSubmitting ? 'Publishing...' : 'Publish poll'}
              </button>
            </div>
          </div>
        )}

        {/* Focused Settings Sheet Modal */}
        {activeSheet && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
            onClick={() => setActiveSheet(null)}
          >
            <div
              className="bg-surface text-ink border border-rule rounded-sheet max-w-sm w-full p-6 text-left space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              {activeSheet === 'integrity' && (
                <>
                  <h3 className="font-display text-lg">Integrity Level</h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="integrity"
                        checked={integrity === 'device'}
                        onChange={() => setIntegrity('device')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">One vote per browser</span>
                        <span className="text-xs text-slate">Enforces single submission using client ballot token.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="integrity"
                        checked={integrity === 'open'}
                        onChange={() => setIntegrity('open')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">Open poll</span>
                        <span className="text-xs text-slate">Anyone can vote multiple times.</span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {activeSheet === 'close' && (
                <>
                  <h3 className="font-display text-lg">Close Duration</h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[1, 24, 72, 168].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          setClosesInHours(hrs);
                          setActiveSheet(null);
                        }}
                        className={`p-2.5 border rounded-row text-center font-medium ${
                          closesInHours === hrs ? 'border-ink bg-paper' : 'border-rule'
                        }`}
                      >
                        {hrs === 1 ? '1 hour' : hrs === 24 ? '24 hours' : hrs === 72 ? '3 days' : '7 days'}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeSheet === 'visibility' && (
                <>
                  <h3 className="font-display text-lg">Results Visibility</h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === 'after_close'}
                        onChange={() => setVisibility('after_close')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">After poll closes</span>
                        <span className="text-xs text-slate">Tallies hidden while poll is open.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === 'after_vote'}
                        onChange={() => setVisibility('after_vote')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">After you vote</span>
                        <span className="text-xs text-slate">Results revealed once the voter casts a ballot.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={visibility === 'always'}
                        onChange={() => setVisibility('always')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">Always live</span>
                        <span className="text-xs text-slate">Anyone can see tally at any time.</span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              {activeSheet === 'kind' && (
                <>
                  <h3 className="font-display text-lg">Ballot Type</h3>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === 'single'}
                        onChange={() => setKind('single')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">Single choice</span>
                        <span className="text-xs text-slate">Voters pick exactly one option.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === 'multi'}
                        onChange={() => setKind('multi')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">Multiple choice</span>
                        <span className="text-xs text-slate">Voters can pick multiple options.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="kind"
                        checked={kind === 'ranked'}
                        onChange={() => setKind('ranked')}
                        className="mt-1"
                      />
                      <div>
                        <span className="font-medium block">Ranked choice (IRV)</span>
                        <span className="text-xs text-slate">Voters rank options by order of preference.</span>
                      </div>
                    </label>
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="px-4 py-1.5 bg-ink text-surface rounded-interactive text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
