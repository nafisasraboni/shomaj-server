import { Db, MongoClient } from "mongodb";
import { getConfig } from "./config";
import type { EventDocument, JoinDocument } from "./models";

export async function withDatabase<T>(operation: (database: Db, client: MongoClient) => Promise<T>): Promise<T> {
  const config = getConfig();
  const client = new MongoClient(config.mongodbUri, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 10_000,
  });
  try {
    await client.connect();
    return await operation(client.db(config.databaseName), client);
  } finally {
    await client.close();
  }
}

export function eventsCollection(database: Db) {
  return database.collection<EventDocument>("events");
}

export function joinsCollection(database: Db) {
  return database.collection<JoinDocument>("eventJoins");
}

export async function ensureIndexes(database: Db) {
  await Promise.all([
    eventsCollection(database).createIndex({ eventDate: 1 }),
    eventsCollection(database).createIndex({ "createdBy.userId": 1, eventDate: 1 }),
    joinsCollection(database).createIndex({ eventId: 1, userId: 1 }, { unique: true }),
    joinsCollection(database).createIndex({ userId: 1, joinedAt: -1 }),
  ]);
}
