// lib/redis.ts
//
// The Vercel "KV" product was sunset and replaced by Marketplace integrations
// (Upstash Redis, etc). Different integration paths have been observed injecting
// slightly different environment variable names. This file checks the common
// possibilities so the app keeps working regardless of which exact names your
// Marketplace integration created.
//
// Known possible pairs, checked in order:
//   1. KV_REST_API_URL / KV_REST_API_TOKEN          (legacy Vercel KV name, still used by some integrations)
//   2. UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (Upstash's own native naming)

import { Redis } from '@upstash/redis';

function resolveCredentials(): { url: string; token: string } {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    '';

  if (!url || !token) {
    throw new Error(
      'No Redis credentials found. In Vercel, go to Storage, connect an Upstash Redis ' +
        'integration to this project, then redeploy. Expected one of: ' +
        'KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.'
    );
  }

  return { url, token };
}

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;
  const { url, token } = resolveCredentials();
  _redis = new Redis({ url, token });
  return _redis;
}
