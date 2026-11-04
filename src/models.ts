import type { ObjectId } from "mongodb";

export const EVENT_TYPES = ["Cleanup", "Plantation", "Donation", "Education", "Healthcare", "Relief", "Animal Welfare", "Other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface EventCreator {
  userId: string;
  email: string;
  name: string;
  image?: string | null;
}

export interface EventDocument {
  _id?: ObjectId;
  title: string;
  description: string;
  eventType: EventType;
  thumbnailUrl: string;
  location: string;
  eventDate: Date;
  createdBy: EventCreator;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JoinDocument {
  _id?: ObjectId;
  eventId: ObjectId;
  userId: string;
  userSnapshot: AuthenticatedUser;
  eventSnapshot: Pick<EventDocument, "title" | "eventType" | "thumbnailUrl" | "location" | "eventDate">;
  joinedAt: Date;
}

export interface SerializedEvent extends Omit<EventDocument, "_id" | "eventDate" | "createdAt" | "updatedAt"> {
  _id: string;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}

export function serializeEvent(event: EventDocument & { _id: ObjectId }): SerializedEvent {
  return {
    ...event,
    _id: event._id.toHexString(),
    eventDate: event.eventDate.toISOString(),
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
  };
}
