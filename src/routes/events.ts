import { Router } from "express";
import { ObjectId, type WithId } from "mongodb";
import { ensureIndexes, eventsCollection, joinsCollection, withDatabase } from "../db";
import { requireAuth } from "../auth";
import { EVENT_TYPES, serializeEvent, type EventDocument } from "../models";
import { eventInputSchema } from "../validation";

export const eventsRouter = Router();

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function eventIdParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

eventsRouter.post("/", requireAuth, async (request, response) => {
  const parsed = eventInputSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid event details", fieldErrors: parsed.error.flatten().fieldErrors });
    return;
  }
  const now = new Date();
  const user = request.user!;
  const event = {
    ...parsed.data,
    createdBy: { userId: user.id, email: user.email, name: user.name, image: user.image },
    participantCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const created = await withDatabase(async (database) => {
    await ensureIndexes(database);
    const result = await eventsCollection(database).insertOne(event);
    return { ...event, _id: result.insertedId };
  });
  response.status(201).json({ message: "Event created successfully", data: serializeEvent(created) });
});

eventsRouter.patch("/:id", requireAuth, async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }
  const parsed = eventInputSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid event details", fieldErrors: parsed.error.flatten().fieldErrors });
    return;
  }
  const objectId = new ObjectId(eventId);
  const updated = await withDatabase(async (database) => {
    const collection = eventsCollection(database);
    const result = await collection.updateOne({ _id: objectId, "createdBy.userId": request.user!.id }, { $set: { ...parsed.data, updatedAt: new Date() } });
    if (!result.matchedCount) return null;
    return collection.findOne({ _id: objectId });
  });
  if (!updated) {
    response.status(403).json({ message: "You can only update events you created" });
    return;
  }
  response.json({ message: "Event updated successfully", data: serializeEvent(updated) });
});

eventsRouter.delete("/:id", requireAuth, async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }
  const objectId = new ObjectId(eventId);
  const deleted = await withDatabase(async (database, client) => {
    const session = client.startSession();
    let wasDeleted = false;
    try {
      await session.withTransaction(async () => {
        const result = await eventsCollection(database).deleteOne({ _id: objectId, "createdBy.userId": request.user!.id }, { session });
        if (!result.deletedCount) return;
        wasDeleted = true;
        await joinsCollection(database).deleteMany({ eventId: objectId }, { session });
      });
      return wasDeleted;
    } finally {
      await session.endSession();
    }
  });
  if (!deleted) {
    response.status(403).json({ message: "You can only delete events you created" });
    return;
  }
  response.json({ message: "Event deleted successfully" });
});

eventsRouter.post("/:id/join", requireAuth, async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }
  const objectId = new ObjectId(eventId);
  try {
    const result = await withDatabase(async (database, client) => {
      await ensureIndexes(database);
      const session = client.startSession();
      let joinedEvent: WithId<EventDocument> | null = null;
      try {
        await session.withTransaction(async () => {
          const event = await eventsCollection(database).findOne({ _id: objectId, eventDate: { $gt: new Date() } }, { session });
          if (!event) return;
          joinedEvent = event;
          await joinsCollection(database).insertOne({
            eventId: objectId,
            userId: request.user!.id,
            userSnapshot: request.user!,
            eventSnapshot: {
              title: event.title,
              eventType: event.eventType,
              thumbnailUrl: event.thumbnailUrl,
              location: event.location,
              eventDate: event.eventDate,
            },
            joinedAt: new Date(),
          }, { session });
          await eventsCollection(database).updateOne({ _id: objectId }, { $inc: { participantCount: 1 } }, { session });
        });
        return joinedEvent;
      } finally {
        await session.endSession();
      }
    });
    if (!result) {
      response.status(404).json({ message: "This event is unavailable or has already passed" });
      return;
    }
    response.status(201).json({ message: "You joined the event successfully" });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      response.json({ message: "You have already joined this event", alreadyJoined: true });
      return;
    }
    throw error;
  }
});

eventsRouter.get("/:id/join-status", requireAuth, async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }

  const joined = await withDatabase(async (database) => {
    const join = await joinsCollection(database).findOne(
      { eventId: new ObjectId(eventId), userId: request.user!.id },
      { projection: { _id: 1 } },
    );
    return Boolean(join);
  });

  response.json({ joined });
});

eventsRouter.delete("/:id/join", requireAuth, async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }

  const objectId = new ObjectId(eventId);
  const removed = await withDatabase(async (database, client) => {
    const session = client.startSession();
    try {
      let wasRemoved = false;
      await session.withTransaction(async () => {
        const result = await joinsCollection(database).deleteOne(
          { eventId: objectId, userId: request.user!.id },
          { session },
        );
        if (!result.deletedCount) return;

        wasRemoved = true;
        await eventsCollection(database).updateOne(
          { _id: objectId, participantCount: { $gt: 0 } },
          { $inc: { participantCount: -1 } },
          { session },
        );
      });
      return wasRemoved;
    } finally {
      await session.endSession();
    }
  });

  response.json({
    message: removed ? "Your attendance has been cancelled" : "You were not joined to this event",
    joined: false,
    removed,
  });
});

eventsRouter.get("/", async (request, response) => {
  const requestedLimit = Number(request.query.limit ?? 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 100;
  const sortDirection = request.query.sort === "desc" ? -1 : 1;
  const search = typeof request.query.search === "string" ? request.query.search.trim().slice(0, 80) : "";
  const eventType = typeof request.query.type === "string" && EVENT_TYPES.includes(request.query.type as (typeof EVENT_TYPES)[number]) ? request.query.type : "";
  const filter: Record<string, unknown> = { eventDate: { $gt: new Date() } };

  if (eventType) filter.eventType = eventType;
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: regex }, { location: regex }, { description: regex }];
  }

  const result = await withDatabase(async (database) => {
    const collection = eventsCollection(database);
    const [events, total] = await Promise.all([
      collection.find(filter).sort({ eventDate: sortDirection }).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return { data: events.map(serializeEvent), total };
  });
  response.json(result);
});

eventsRouter.get("/:id", async (request, response) => {
  const eventId = eventIdParam(request.params.id);
  if (!eventId || !ObjectId.isValid(eventId)) {
    response.status(404).json({ message: "Event not found" });
    return;
  }
  const event = await withDatabase((database) => eventsCollection(database).findOne({ _id: new ObjectId(eventId) }));
  if (!event) {
    response.status(404).json({ message: "Event not found" });
    return;
  }
  response.json({ data: serializeEvent(event) });
});
