import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("Shomaj API", () => {
  it("reports service health", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toMatchObject({ status: "ok", service: "shomaj-api" });
  });

  it("returns JSON for unknown routes", async () => {
    const response = await request(app).get("/missing").expect(404);
    expect(response.body.message).toBe("Route not found");
  });

  it("protects event creation", async () => {
    const response = await request(app).post("/api/events").send({}).expect(401);
    expect(response.body.message).toBe("Authentication is required");
  });

  it("protects join status and attendance cancellation", async () => {
    const eventId = "507f1f77bcf86cd799439011";
    await request(app).get(`/api/events/${eventId}/join-status`).expect(401);
    await request(app).delete(`/api/events/${eventId}/join`).expect(401);
  });

  it("rejects malformed JSON", async () => {
    const response = await request(app).post("/api/events").set("Content-Type", "application/json").send("{").expect(400);
    expect(response.body.message).toBe("Request body must contain valid JSON");
  });
});
