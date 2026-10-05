import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().url('Invalid MongoDB URI'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  CSRF_TOKEN_SECRET: z.string().min(32, 'CSRF_TOKEN_SECRET must be at least 32 characters'),
  CLIENT_URL: z.string().url('Invalid CLIENT_URL'),
  HTTPS_ONLY: z.string().default('false'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

type RawEnvVars = z.infer<typeof envSchema>;

export interface EnvVars {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  MONGO_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  REFRESH_TOKEN_EXPIRY: string;
  CSRF_TOKEN_SECRET: string;
  CLIENT_URL: string;
  HTTPS_ONLY: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug';
}

function trimEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // Dashboard env-var UIs (Render, etc.) don't always strip trailing
  // whitespace/newlines from pasted values, which silently fails strict
  // enum checks like NODE_ENV below. Trim everything before validating.
  const trimmed: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    trimmed[key] = typeof value === 'string' ? value.trim() : value;
  }
  return trimmed;
}

export function validateEnv(): EnvVars {
  try {
    const raw = envSchema.parse(trimEnv(process.env));
    return {
      ...raw,
      HTTPS_ONLY: raw.HTTPS_ONLY === 'true',
    } as EnvVars;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.issues.forEach(err => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

const env = validateEnv();
export default env;
