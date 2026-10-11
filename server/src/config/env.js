import 'dotenv/config';
import { isIP } from 'node:net';
import { z } from 'zod';

// Rejects the your_... placeholders from .env.example, so a copied example file can't run
// with publicly known secrets.
const notPlaceholder = (schema) =>
  schema.refine((value) => !value.startsWith('your_'), 'still the .env.example placeholder; set a real value');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGO_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  // Resolvers for the mongodb+srv:// SRV lookup (comma-separated IPs). Some ISP/router
  // DNS servers refuse SRV queries; public resolvers work around that.
  DNS_SERVERS: z
    .string()
    .default('8.8.8.8,1.1.1.1')
    .transform((value) => value.split(',').map((s) => s.trim()).filter(Boolean))
    .refine((list) => list.length > 0 && list.every((ip) => isIP(ip)), 'must be comma-separated IP addresses'),
  JWT_ACCESS_SECRET: notPlaceholder(z.string().min(32)),
  JWT_REFRESH_SECRET: notPlaceholder(z.string().min(32)),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GEMINI_API_KEY: notPlaceholder(z.string().min(1)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables (see server/.env.example):');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
});
