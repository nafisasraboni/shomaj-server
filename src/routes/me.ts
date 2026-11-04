import { Router } from "express";
import { requireAuth } from "../auth";
import { eventsCollection, joinsCollection, withDatabase } from "../db";
import { serializeEvent } from "../models";

export const meRouter = Router();

meRouter.use(requireAuth);

meRouter.get("/events", async (request, response) => {
  const events = await withDatabase((database) => eventsCollection(database).find({ "createdBy.userId": request.user!.id }).sort({ eventDate: 1 }).toArray());
  response.json({ data: events.map(serializeEvent) });
});

meRouter.get("/joined-events", async (request, response) => {
  const data = await withDatabase(async (database) => {
    const joins = await joinsCollection(database).find({ userId: request.user!.id }).toArray();
    if (!joins.length) return [];
    const events = await eventsCollection(database).find({ _id: { $in: joins.map((join) => join.eventId) } }).sort({ eventDate: 1 }).toArray();
    const joinsByEvent = new Map(joins.map((join) => [join.eventId.toHexString(), join]));
    return events.map((event) => {
      const join = joinsByEvent.get(event._id.toHexString())!;
      return { _id: join._id!.toHexString(), joinedAt: join.joinedAt.toISOString(), event: serializeEvent(event) };
    });
  });
  response.json({ data });
});
