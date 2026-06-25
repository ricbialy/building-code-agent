import { z } from 'zod';

const jurisdictionSchema = z.object({
  city: z.string().min(1),
  county: z.string().optional(),
  state: z.string().min(2).max(2),
});

const imageSchema = z.object({
  media_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  data: z.string().min(1),
});

const modeSchema = z.enum(['scored_answer', 'reviewer_email', 'eor_memo']);

export const analyzeSchema = z.object({
  jurisdiction: jurisdictionSchema,
  code_edition: z.string().optional(),
  as_of_date: z.string().optional(),
  question: z.string().min(1),
  facts: z.record(z.unknown()).optional().default({}),
  images: z.array(imageSchema).max(4).optional().default([]),
  mode: modeSchema,
  options: z.object({
    model: z.string().optional(),
    max_tokens: z.number().int().min(100).max(8000).optional(),
  }).optional().default({}),
});

export const askSchema = z.object({
  jurisdiction: jurisdictionSchema,
  question: z.string().min(1),
  images: z.array(imageSchema).max(4).optional().default([]),
  mode: modeSchema,
  options: z.object({
    model: z.string().optional(),
    max_tokens: z.number().int().min(100).max(8000).optional(),
  }).optional().default({}),
});
