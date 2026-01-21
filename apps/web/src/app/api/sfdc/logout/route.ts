import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/sfdcAuth';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url));
  clearAuthCookie(response);
  return response;
}
