'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { Poll } from '@/lib/collective/types';

interface OptionItem {
  id: string;
  label: string;
  subtitle: string;
}

const OPTION_COLORS = ['#5D3FD3', '#00838F', '#C2185B', '#D97706', '#2563EB', '#059669'];

export const AskQuestionModal: React.FC = () => {
  const { isAskModalOpen, closeAskModal, createPoll } = usePsepho();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Poll['category']>('Work & Tech');
  const [options, setOptions] = useState<OptionItem[]>([
    { id: '1', label: '', subtitle: '' },
    { id: '2', label: '', subtitle: '' },
  ]);

  if (!isAskModalOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [
      ...prev,
      { id: String(Date.now()), label: '', subtitle: '' },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (index: number, field: 'label' | 'subtitle', val: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter((o) => o.label.trim().length > 0);
    if (!question.trim() || validOptions.length < 2) return;

    createPoll({
      question: question.trim(),
      category,
      options: validOptions.map((opt) => ({
        label: opt.label.trim(),
        subtitle: opt.subtitle.trim() || 'Community proposal',
        icon: 'how_to_vote',
      })),
    });

    // Reset form
    setQuestion('');
    setOptions([
      { id: '1', label: '', subtitle: '' },
      { id: '2', label: '', subtitle: '' },
    ]);
    closeAskModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-outline-variant/30 relative my-8 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={closeAskModal}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="material-symbols-outlined text-primary">add_circle</span>
          <span className="font-label-bold text-xs uppercase tracking-wider text-primary">
            New Consensus Debate
          </span>
        </div>
        <h3 className="font-headline-md text-2xl text-on-surface mb-4">Ask the Collective</h3>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-grow">
          {/* Question Input */}
          <div>
            <label className="block font-label-bold text-xs text-on-surface-variant mb-1.5">
              The Question
            </label>
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Four-day work week with 10-hour days?"
              className="w-full px-4 py-2.5 bg-surface-container-low rounded-lg border border-transparent focus:border-primary focus:bg-surface-bright text-on-surface placeholder:text-outline-variant font-body-md text-sm outline-none transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-label-bold text-xs text-on-surface-variant mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2 bg-surface-container-low rounded-lg border-0 focus:ring-2 focus:ring-primary text-on-surface font-body-md text-sm outline-none"
            >
              <option value="Work & Tech">Work & Tech</option>
              <option value="Economy & Future">Economy & Future</option>
              <option value="Society & Governance">Society & Governance</option>
              <option value="Culture & Life">Culture & Life</option>
            </select>
          </div>

          {/* Options List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-label-bold text-xs text-on-surface-variant">
                Choices ({options.length} configured)
              </label>
              <span className="text-[11px] text-outline">Minimum 2 options</span>
            </div>

            {options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const color = OPTION_COLORS[idx % OPTION_COLORS.length];

              return (
                <div
                  key={opt.id}
                  className="p-3 bg-surface-container-low/60 rounded-lg border border-outline-variant/20 space-y-2 relative transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: color }}
                    >
                      Option {letter}
                    </span>

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-outline hover:text-error p-1 rounded-full hover:bg-error/10 transition-colors"
                        title="Remove this option"
                      >
                        <span className="material-symbols-outlined text-sm leading-none">close</span>
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={opt.label}
                    onChange={(e) => handleOptionChange(idx, 'label', e.target.value)}
                    placeholder={`Option ${letter} label (e.g. ${idx === 0 ? 'Support' : idx === 1 ? 'Oppose' : 'Neutral / Alternative'})`}
                    className="w-full px-3 py-2 bg-surface-bright rounded-md border border-outline-variant/30 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <input
                    type="text"
                    value={opt.subtitle}
                    onChange={(e) => handleOptionChange(idx, 'subtitle', e.target.value)}
                    placeholder="Short rationale (optional)"
                    className="w-full px-3 py-1.5 bg-surface-bright rounded-md border border-outline-variant/30 text-xs text-on-surface-variant focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              );
            })}

            {/* + Add Option Button */}
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="w-full py-2.5 border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary text-xs font-label-bold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150"
              >
                <span className="material-symbols-outlined text-base font-bold">add</span>
                <span>Add Another Option ({options.length}/6)</span>
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant/20 mt-2">
            <button
              type="button"
              onClick={closeAskModal}
              className="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface rounded-full transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-on-primary font-label-bold text-sm rounded-full shadow-md hover:scale-[1.02] active:scale-95 transition-transform duration-150"
            >
              Publish Debate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
