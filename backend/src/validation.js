import { z } from 'zod';
const text = (max = 10000) => z.string().trim().max(max);
const url = z
  .union([
    z.literal(''),
    z
      .url()
      .max(2000)
      .refine((v) => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS URL'),
  ])
  .default('');
const resumeLink = z
  .union([
    url,
    z
      .string()
      .max(2000)
      .regex(/^\/(?!\/)[A-Za-z0-9_./%-]+$/)
      .refine((v) => !v.split('/').includes('..'), 'Use a path within this site'),
  ])
  .default('');
const list = (length, max) =>
  z
    .array(text(length))
    .max(max)
    .transform((items) => items.filter(Boolean))
    .default([]);
const connections = z
  .array(text(80).min(1))
  .max(8)
  .transform((items) => [
    ...new Map(items.map((label) => [label.toLocaleLowerCase(), label])).values(),
  ])
  .default([]);
const claimEvidence = z
  .array(
    z.object({
      section: z.enum([
        'overview',
        'problem',
        'outcomes',
        'architecture',
        'features',
        'challenges',
        'learnings',
      ]),
      claim: text(500).min(1),
      sources: list(500, 8),
    }),
  )
  .max(30)
  .default([]);
export const projectSchema = z.object({
  title: text(150).min(1),
  slug: text(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  tagline: text(300).default(''),
  overview: text().default(''),
  problem: text().default(''),
  outcomes: text(5000).default(''),
  architecture: text(15000).default(''),
  contribution: text().default(''),
  challenges: text().default(''),
  learnings: text().default(''),
  features: list(500, 30),
  technologies: list(100, 40),
  connections,
  sourcePaths: list(500, 30),
  sourceWarnings: list(1000, 20),
  treeTruncated: z.boolean().default(false),
  claimEvidence,
  missingInformation: list(500, 20),
  suggestedSections: list(100, 15),
  coverImage: url,
  images: z
    .array(url)
    .max(12)
    .transform((items) => items.filter(Boolean))
    .default([]),
  repositoryUrl: url,
  demoUrl: url,
  githubOwner: text(100).default(''),
  githubRepo: text(100).default(''),
  repositoryPrivate: z.boolean().default(false),
  privatePublicationApproved: z.boolean().default(false),
  status: z.enum(['draft', 'published']).default('draft'),
  featured: z.boolean().default(false),
  position: z.number().int().min(0).max(10000).default(0),
  version: z.number().int().positive().optional(),
});
export const profileSchema = z.object({
  name: text(100).min(1),
  introduction: text(300).min(1),
  interests: text(3000),
  biography: text(),
  location: text(150),
  graduationYear: text(10),
  education: text(3000),
  experience: text(5000),
  skills: z.array(text(100)).max(60),
  github: url,
  linkedin: url,
  resumeUrl: resumeLink,
  email: z.union([z.literal(''), z.email()]),
  version: z.number().int().positive().optional(),
});
export const contactSchema = z.object({
  name: text(100).min(2),
  email: z.email().max(254),
  message: text(5000).min(10),
  website: text(200).optional(),
});
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
