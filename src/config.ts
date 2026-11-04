export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getConfig() {
  return {
    mongodbUri: getRequiredEnv("MONGODB_URI"),
    databaseName: process.env.MONGODB_DB_NAME ?? "shomaj",
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
    authBaseUrl: process.env.AUTH_BASE_URL ?? "http://localhost:3000",
  };
}
