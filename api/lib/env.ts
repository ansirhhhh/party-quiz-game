import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    console.warn(`Warning: Environment variable ${name} not set, using default`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID") || "quiz-app",
  appSecret: required("APP_SECRET") || "secret-key",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL") || "",
};
