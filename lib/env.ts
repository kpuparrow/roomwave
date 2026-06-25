import { z } from "zod";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOSTNAME: z.string().default("0.0.0.0"),
  APPLE_MUSIC_DEVELOPER_TOKEN: z.string().optional(),
  APPLE_MUSIC_STOREFRONT: z.string().default("us"),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  NEXT_PUBLIC_RTC_STUN_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
