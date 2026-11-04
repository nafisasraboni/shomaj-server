import { z } from "zod";
import { EVENT_TYPES } from "./models";

export const eventInputSchema = z.object({
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().min(30).max(2000),
  eventType: z.enum(EVENT_TYPES),
  thumbnailUrl: z.url().max(1200),
  location: z.string().trim().min(3).max(160),
  eventDate: z.coerce.date().refine((date) => date.getTime() > Date.now(), "Event date must be in the future"),
}).strict();
