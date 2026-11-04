import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, customFetch, jwtVerify, type JWTPayload } from "jose";
import { getConfig } from "./config";
import type { AuthenticatedUser } from "./models";

let cachedBaseUrl = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks(baseUrl: string) {
  if (!cachedJwks || cachedBaseUrl !== baseUrl) {
    cachedBaseUrl = baseUrl;
    cachedJwks = createRemoteJWKSet(new URL(`${baseUrl}/api/auth/jwks`), {
      [customFetch]: async (input, init) => {
        try {
          const { env } = await import("cloudflare:workers");
          const authService = (env as typeof env & { AUTH_SERVICE?: Fetcher }).AUTH_SERVICE;
          if (authService) return authService.fetch(input, init);
        } catch {
          // Node-based tests and local tooling do not expose Cloudflare bindings.
        }
        return fetch(input, init);
      },
    });
  }
  return cachedJwks;
}

function payloadToUser(payload: JWTPayload): AuthenticatedUser | null {
  const id = typeof payload.id === "string" ? payload.id : payload.sub;
  if (!id || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
  return {
    id,
    email: payload.email,
    name: payload.name,
    image: typeof payload.image === "string" ? payload.image : null,
  };
}

export async function verifyBearerToken(token: string): Promise<AuthenticatedUser> {
  const { authBaseUrl } = getConfig();
  const { payload } = await jwtVerify(token, getJwks(authBaseUrl), {
    issuer: authBaseUrl,
    audience: authBaseUrl,
  });
  const user = payloadToUser(payload);
  if (!user) throw new Error("JWT user claims are incomplete");
  return user;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication is required" });
    return;
  }
  try {
    request.user = await verifyBearerToken(authorization.slice(7));
    next();
  } catch (error) {
    console.warn("JWT verification failed", error instanceof Error ? error.message : "Unknown verification error");
    response.status(401).json({ message: "Your session is invalid or has expired" });
  }
}
