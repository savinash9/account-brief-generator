import { NextResponse } from 'next/server';
import {
  buildCodeChallenge,
  buildLoginUrlWithPkce,
  generateCodeVerifier,
  generateState,
  setStateCookie,
  setVerifierCookie
} from '@/lib/sfdcAuth';

export async function GET() {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = buildCodeChallenge(verifier);
  const response = NextResponse.redirect(buildLoginUrlWithPkce(state, challenge));
  setStateCookie(response, state);
  setVerifierCookie(response, verifier);
  return response;
}
