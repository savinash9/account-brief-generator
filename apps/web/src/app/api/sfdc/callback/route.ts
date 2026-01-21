import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  clearStateCookie,
  clearVerifierCookie,
  exchangeCodeForToken,
  readState,
  readVerifier,
  setAuthCookie
} from '@/lib/sfdcAuth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = readState(cookies());
  const verifier = readVerifier(cookies());

  if (!code || !state || !cookieState || state !== cookieState || !verifier) {
    return NextResponse.redirect(new URL('/?sfdc=error', request.url));
  }

  try {
    const auth = await exchangeCodeForToken(code, verifier);
    const response = NextResponse.redirect(new URL('/?sfdc=connected', request.url));
    setAuthCookie(response, auth);
    clearStateCookie(response);
    clearVerifierCookie(response);
    return response;
  } catch {
    return NextResponse.redirect(new URL('/?sfdc=error', request.url));
  }
}
