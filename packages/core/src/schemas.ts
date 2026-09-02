import { z } from 'zod';

export const PollKindSchema = z.enum(['single', 'multi', 'ranked']);
export const IntegrityLevelSchema = z.enum(['open', 'device', 'verified']);
export const VisibilityModeSchema = z.enum(['always', 'after_vote', 'after_close']);

export const CreatePollSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(500, 'Question too long'),
  kind: PollKindSchema.default('single'),
  options: z.array(z.string().trim().min(1, 'Option cannot be empty')).min(2, 'Minimum 2 options required').max(20, 'Maximum 20 options allowed'),
  maxChoices: z.number().int().positive().nullable().optional(),
  integrity: IntegrityLevelSchema.default('device'),
  visibility: VisibilityModeSchema.default('after_close'),
  allowRevision: z.boolean().default(true),
  closesInHours: z.number().positive().nullable().optional(), // e.g. 24
  closesAt: z.string().datetime().nullable().optional(),
}).refine((data) => {
  if (data.kind === 'multi' && data.maxChoices !== null && data.maxChoices !== undefined) {
    return data.maxChoices <= data.options.length;
  }
  return true;
}, {
  message: 'maxChoices cannot exceed total number of options',
  path: ['maxChoices'],
});

export type CreatePollInput = z.infer<typeof CreatePollSchema>;

export const CastBallotSchema = z.object({
  choice: z.array(z.string().uuid()).min(1, 'At least one choice required'),
  ballotToken: z.string().min(16, 'Ballot token must be at least 16 characters'),
});

export type CastBallotInput = z.infer<typeof CastBallotSchema>;

export const ManageActionSchema = z.object({
  creatorToken: z.string().min(16, 'Creator token required'),
  action: z.enum(['close', 'delete', 'update_close_time', 'regenerate_link']),
  closesAt: z.string().datetime().optional(),
});

export type ManageActionInput = z.infer<typeof ManageActionSchema>;

export const ReceiptLookupQuerySchema = z.object({
  code: z.string().min(6).max(6),
  poll: z.string().min(8).max(8).optional(),
});

export type ReceiptLookupQuery = z.infer<typeof ReceiptLookupQuerySchema>;
