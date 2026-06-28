// app/api/push/generate-keys/route.ts
//
// One-time setup helper. Visit this URL once after deploying (e.g.
// yourapp.vercel.app/api/push/generate-keys) to generate a VAPID key pair.
// Copy the two keys it returns into Vercel's Environment Variables as
// VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY, then redeploy.
//
// Safe to ignore/delete after setup - it doesn't store anything, just generates
// and displays a fresh key pair each time it's called.
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function GET() {
  const keys = webpush.generateVAPIDKeys();
  return NextResponse.json({
    instructions:
      'Copy these into Vercel Project Settings -> Environment Variables, then redeploy. ' +
      'Also add VAPID_SUBJECT as something like mailto:youremail@example.com.',
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
  });
}
