function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  get SUPABASE_URL() { return requireEnv('NEXT_PUBLIC_SUPABASE_URL'); },
  get SUPABASE_ANON_KEY() { return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); },
  get DATABASE_URL() { return requireEnv('DATABASE_URL'); },
  get RELAY_PRIVATE_KEY() { return optionalEnv('RELAY_PRIVATE_KEY'); },
  get TOKEN_ENCRYPTION_KEY() { return optionalEnv('TOKEN_ENCRYPTION_KEY'); },
  get QBO_CLIENT_ID() { return requireEnv('QBO_CLIENT_ID'); },
  get QBO_CLIENT_SECRET() { return requireEnv('QBO_CLIENT_SECRET'); },
  get OPENAI_API_KEY() { return optionalEnv('OPENAI_API_KEY'); },
} as const;
