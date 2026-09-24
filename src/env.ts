import 'dotenv/config';
import { z } from 'zod';

const csv = (s: string) =>
  s.split(',').map((v) => v.trim()).filter(Boolean);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001').transform(csv),

  /** Auth stub: acts as this user when a request carries no bearer token. */
  DEV_AUTH_USER_ID: z.string().uuid().optional().or(z.literal('').transform(() => undefined)),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid environment. Copy .env.example to .env and fill it in.\n${issues.join('\n')}`);
  process.exit(1);
}

export const env = parsed.data;

/** The dev auth stub is only ever honoured outside production. */
export const devAuthUserId =
  env.NODE_ENV === 'production' ? undefined : env.DEV_AUTH_USER_ID;
