import { z } from "zod";

export const CATEGORIES = [
  "ID Card",
  "Electronics",
  "Stationery",
  "Bottle",
  "Clothing",
  "Books",
  "Other",
] as const;

export const RESOURCE_CATEGORIES = [
  "Books",
  "Electronics",
  "Lab Kit",
  "Stationery",
  "Sports",
  "Other",
] as const;

const shortText = z.string().trim().min(2).max(120);
const longText = z.string().trim().max(1000);

export const lostItemSchema = z.object({
  title: shortText,
  description: longText,
  category: z.enum(CATEGORIES),
  locationLost: shortText,
  dateLost: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactInfo: z.string().trim().min(4).max(160),
  imagePath: z.string().trim().max(300).optional().nullable(),
});

export const foundItemSchema = z.object({
  title: shortText,
  description: longText,
  category: z.enum(CATEGORIES),
  locationFound: shortText,
  dateFound: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contactInfo: z.string().trim().min(4).max(160),
  imagePath: z.string().trim().max(300).optional().nullable(),
});

export const resourceSchema = z.object({
  title: shortText,
  description: longText,
  category: z.enum(RESOURCE_CATEGORIES),
  itemCondition: z.string().trim().min(2).max(40),
  contactInfo: z.string().trim().min(4).max(160),
  imagePath: z.string().trim().max(300).optional().nullable(),
});

export const claimSchema = z.object({
  foundItemId: z.string().uuid(),
  lostItemId: z.string().uuid().optional().nullable(),
  whereWhen: z.string().trim().min(2).max(300),
  identifyingDetails: z.string().trim().min(5).max(1000),
  message: longText.default(""),
  contactInfo: z.string().trim().min(4).max(160),
  proofPhoto: z.string().trim().max(300).optional().nullable(),
});

export const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  meetingNote: z.string().trim().max(200).optional().nullable(),
});

export const claimIdSchema = z.object({ id: z.string().uuid() });

export const claimMessageSchema = z.object({
  claimId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

export const listingSchema = z.object({
  itemType: z.enum(["lost", "found", "resource"]),
  itemId: z.string().uuid(),
  listed: z.boolean(),
});

export const borrowSchema = z.object({
  resourceId: z.string().uuid(),
  message: longText,
  requestedDuration: z.string().trim().min(2).max(40),
});

export const borrowDecisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected", "returned"]),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  campus: z.string().trim().max(80).optional().nullable(),
  contactInfo: z.string().trim().max(160).optional().nullable(),
});

export const matchRequestSchema = z.object({
  itemId: z.string().uuid(),
  itemType: z.enum(["lost", "found"]),
});

export const notificationIdSchema = z.object({ id: z.string().uuid() });

export const contactRequestSchema = z.object({
  itemType: z.enum(["lost", "found", "resource"]),
  itemId: z.string().uuid(),
});

export const listQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

export type LostItemInput = z.infer<typeof lostItemSchema>;
export type FoundItemInput = z.infer<typeof foundItemSchema>;
export type ResourceInput = z.infer<typeof resourceSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

/** Signed-out visitors get the tutorial samples; signed-in users never do. */
export const boardQuerySchema = z
  .object({ includeSamples: z.boolean().optional() })
  .optional()
  .transform((value) => ({ includeSamples: value?.includeSamples === true }));
