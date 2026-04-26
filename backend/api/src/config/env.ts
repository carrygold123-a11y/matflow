import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  STORAGE_PATH: z.string().min(1),
  STORAGE_DRIVER: z.string().default('local'),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  VITE_API_URL: z.string().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
});

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  return envSchema.parse(config);
}
