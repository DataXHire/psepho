'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import type { Poll } from '@/lib/collective/types';
import { appConfig, POLL_CATEGORIES } from '@/lib/config/appConfig';
import { choiceColours } from '@/lib/theme';
import { Button, Dropdown, Modal, type DropdownOption } from '@/components/ui';

interface DraftOption {
  id: string;
  label: string;
  subtitle: string;
}

const { minOptions, maxOptions, durations } = appConfig.poll;

const CATEGORY_OPTIONS: DropdownOption<Poll['category']>[] = POLL_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

const DURATION_OPTIONS: DropdownOption<string>[] = durations.map((duration) => ({
  value: String(duration.days ?? 'always'),
  label: duration.label,
  hint: duration.days === null ? 'You end it yourself, whenever you choose' : undefined,
}));

const emptyDraft = (): DraftOption[] => [
  { id: 'a', label: '', subtitle: '' },
  { id: 'b', label: '', subtitle: '' },
];

export const AskQuestionModal: React.FC = () => {
  const { isAskModalOpen, closeAskModal, createPoll } = usePsepho();

  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState<Poll['category']>(POLL_CATEGORIES[0]);
  const [duration, setDuration] = useState<string>(String(durations[2].days ?? 'always'));
  const [options, setOptions] = useState<DraftOption[]>(emptyDraft);

  const reset = () => {
    setQuestion('');
    setCategory(POLL_CATEGORIES[0]);
    setDuration(String(durations[2].days ?? 'always'));
    setOptions(emptyDraft());
  };

  const dismiss = () => {
    reset();
    closeAskModal();
  };

  const addOption = () =>
    setOptions((prev) =>
      prev.length >= maxOptions
        ? prev
        : [...prev, { id: `o${Date.now()}`, label: '', subtitle: '' }]
    );

  const removeOption = (index: number) =>
    setOptions((prev) => (prev.length <= minOptions ? prev : prev.filter((_, i) => i !== index)));

  const editOption = (index: number, field: 'label' | 'subtitle', value: string) =>
    setOptions((prev) =>
      prev.map((option, i) => (i === index ? { ...option, [field]: value } : option))
    );

  const filled = options.filter((option) => option.label.trim().length > 0);
  const canSubmit = question.trim().length > 0 && filled.length >= minOptions;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    createPoll({
      question: question.trim(),
      category,
      durationDays: duration === 'always' ? null : Number(duration),
      options: filled.map((option) => ({
        label: option.label.trim(),
        subtitle: option.subtitle.trim() || 'Community proposal',
        icon: 'how_to_vote',
      })),
    });

    dismiss();
  };

  const fieldClass =
    'w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:bg-surface-bright';

  return (
    <Modal
      open={isAskModalOpen}
      onClose={dismiss}
      eyebrow="New consensus debate"
      eyebrowIcon="add_circle"
      title="Ask the Collective"
      labelledBy="ask-modal-title"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-on-surface-variant">
            {canSubmit
              ? `${filled.length} choices ready`
              : `Add a question and at least ${minOptions} choices`}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={dismiss}>
              Cancel
            </Button>
            <Button type="submit" form="ask-form" disabled={!canSubmit} icon="campaign">
              Publish Debate
            </Button>
          </div>
        </div>
      }
    >
      <form id="ask-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="ask-question"
            className="mb-1.5 block font-label-bold text-xs text-on-surface-variant"
          >
            The question
          </label>
          <input
            id="ask-question"
            type="text"
            required
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. Four-day work week with 10-hour days?"
            className={fieldClass}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block font-label-bold text-xs text-on-surface-variant">
              Category
            </span>
            <Dropdown
              value={category}
              options={CATEGORY_OPTIONS}
              onChange={setCategory}
              ariaLabel="Category"
              icon="category"
            />
          </div>
          <div>
            <span className="mb-1.5 block font-label-bold text-xs text-on-surface-variant">
              Voting stays open for
            </span>
            <Dropdown
              value={duration}
              options={DURATION_OPTIONS}
              onChange={setDuration}
              ariaLabel="How long voting stays open"
              icon="schedule"
            />
          </div>
        </div>

        <fieldset className="space-y-3 pt-1">
          <legend className="sr-only">Choices</legend>
          <div className="flex items-center justify-between">
            <span className="font-label-bold text-xs text-on-surface-variant">
              Choices ({options.length} of {maxOptions})
            </span>
            <span className="text-[11px] text-outline">At least {minOptions}</span>
          </div>

          {options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            const colour = choiceColours[index % choiceColours.length].color;
            return (
              <div
                key={option.id}
                className="space-y-2 rounded-lg border border-outline-variant/20 bg-surface-container-low/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: colour }}
                  >
                    Option {letter}
                  </span>
                  {options.length > minOptions && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label={`Remove option ${letter}`}
                      className="rounded-full p-1 text-outline transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">close</span>
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  required={index < minOptions}
                  value={option.label}
                  onChange={(event) => editOption(index, 'label', event.target.value)}
                  aria-label={`Option ${letter} label`}
                  placeholder={`Option ${letter} label`}
                  className={fieldClass}
                />
                <input
                  type="text"
                  value={option.subtitle}
                  onChange={(event) => editOption(index, 'subtitle', event.target.value)}
                  aria-label={`Option ${letter} rationale`}
                  placeholder="Short rationale (optional)"
                  className={`${fieldClass} text-xs`}
                />
              </div>
            );
          })}

          {options.length < maxOptions && (
            <button
              type="button"
              onClick={addOption}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-primary/30 py-2.5 font-label-bold text-xs text-primary transition-all duration-150 hover:border-primary hover:bg-primary/5"
            >
              <span className="material-symbols-outlined text-base font-bold">add</span>
              <span>
                Add another choice ({options.length}/{maxOptions})
              </span>
            </button>
          )}
        </fieldset>
      </form>
    </Modal>
  );
};
