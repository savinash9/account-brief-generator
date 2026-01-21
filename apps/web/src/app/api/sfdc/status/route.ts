import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readAuth } from '@/lib/sfdcAuth';

export async function GET() {
  const auth = readAuth(cookies());
  return NextResponse.json({ connected: Boolean(auth) });
}
