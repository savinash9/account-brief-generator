import crypto from 'node:crypto';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';
import { NextResponse } from 'next/server';

const AUTH_COOKIE = 'sfdc_auth';
const STATE_COOKIE = 'sfdc_oauth_state';
const VERIFIER_COOKIE = 'sfdc_oauth_verifier';

export type SfdcAuth = {
  accessToken: string;
  refreshToken: string;
  instanceUrl: string;
  issuedAt: number;
};

export type SfdcAccessContext = Pick<SfdcAuth, 'accessToken' | 'instanceUrl'>;

function getCookieSecret() {
  const raw = process.env.SFDC_COOKIE_SECRET;
  if (!raw) {
    throw new Error('Missing SFDC_COOKIE_SECRET.');
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('SFDC_COOKIE_SECRET must be base64 for 32 bytes.');
  }
  return key;
}

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

function encryptPayload(payload: object) {
  const key = getCookieSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(encoded), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64UrlEncode(iv)}.${base64UrlEncode(tag)}.${base64UrlEncode(ciphertext)}`;
}

function decryptPayload<T>(value: string): T | null {
  try {
    const [ivPart, tagPart, dataPart] = value.split('.');
    if (!ivPart || !tagPart || !dataPart) {
      return null;
    }
    const key = getCookieSecret();
    const iv = base64UrlDecode(ivPart);
    const tag = base64UrlDecode(tagPart);
    const data = base64UrlDecode(dataPart);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    return null;
  }
}

function getLoginBaseUrl() {
  return process.env.SFDC_LOGIN_URL ?? 'https://login.salesforce.com';
}

function getRedirectUri() {
  const redirectUri = process.env.SFDC_OAUTH_REDIRECT_URI;
  if (!redirectUri) {
    throw new Error('Missing SFDC_OAUTH_REDIRECT_URI.');
  }
  return redirectUri;
}

function getClientId() {
  const clientId = process.env.SFDC_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error('Missing SFDC_OAUTH_CLIENT_ID.');
  }
  return clientId;
}

function getClientSecret() {
  const clientSecret = process.env.SFDC_OAUTH_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error('Missing SFDC_OAUTH_CLIENT_SECRET.');
  }
  return clientSecret;
}

export function buildLoginUrl(state: string) {
  const loginUrl = new URL('/services/oauth2/authorize', getLoginBaseUrl());
  loginUrl.searchParams.set('response_type', 'code');
  loginUrl.searchParams.set('client_id', getClientId());
  loginUrl.searchParams.set('redirect_uri', getRedirectUri());
  loginUrl.searchParams.set('scope', 'refresh_token api');
  loginUrl.searchParams.set('state', state);
  return loginUrl.toString();
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

export function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

export function buildCodeChallenge(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

export function buildLoginUrlWithPkce(state: string, challenge: string) {
  const loginUrl = new URL(buildLoginUrl(state));
  loginUrl.searchParams.set('code_challenge', challenge);
  loginUrl.searchParams.set('code_challenge_method', 'S256');
  return loginUrl.toString();
}

export function readAuth(cookies: ReadonlyRequestCookies): SfdcAuth | null {
  const value = cookies.get(AUTH_COOKIE)?.value;
  if (!value) {
    return null;
  }
  return decryptPayload<SfdcAuth>(value);
}

export function readState(cookies: ReadonlyRequestCookies) {
  return cookies.get(STATE_COOKIE)?.value ?? null;
}

export function readVerifier(cookies: ReadonlyRequestCookies) {
  return cookies.get(VERIFIER_COOKIE)?.value ?? null;
}

export function setAuthCookie(response: NextResponse, auth: SfdcAuth) {
  response.cookies.set(AUTH_COOKIE, encryptPayload(auth), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export function setStateCookie(response: NextResponse, state: string) {
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600
  });
}

export function clearStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export function setVerifierCookie(response: NextResponse, verifier: string) {
  response.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600
  });
}

export function clearVerifierCookie(response: NextResponse) {
  response.cookies.set(VERIFIER_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });
}

export async function exchangeCodeForToken(code: string, verifier: string): Promise<SfdcAuth> {
  const tokenUrl = new URL('/services/oauth2/token', getLoginBaseUrl());
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    code_verifier: verifier
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Salesforce token error: ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    instance_url: string;
    issued_at?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    instanceUrl: data.instance_url,
    issuedAt: data.issued_at ? Number(data.issued_at) : Date.now()
  };
}

export async function refreshAuth(auth: SfdcAuth): Promise<SfdcAuth> {
  const tokenUrl = new URL('/services/oauth2/token', getLoginBaseUrl());
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
    client_id: getClientId(),
    client_secret: getClientSecret()
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Salesforce refresh error: ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    instance_url: string;
    issued_at?: string;
  };

  return {
    ...auth,
    accessToken: data.access_token,
    instanceUrl: data.instance_url ?? auth.instanceUrl,
    issuedAt: data.issued_at ? Number(data.issued_at) : Date.now()
  };
}

export function needsRefresh(auth: SfdcAuth) {
  const ageMs = Date.now() - auth.issuedAt;
  return ageMs > 90 * 60 * 1000;
}
