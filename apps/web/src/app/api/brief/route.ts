import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { BriefPayload, BriefResponse, SalesforceBrief } from '@/lib/types';
import { fetchPublicCompanyContext } from '@/lib/publicEnrichment';
import { formatBrief, mergeBriefData } from '@/lib/briefFormatter';
import { getSalesforceBrief } from '@/lib/mcpClient';
import { needsRefresh, readAuth, refreshAuth, setAuthCookie } from '@/lib/sfdcAuth';

function sanitizeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(
      /(password|token|secret|access_token)\s*[:=]\s*\S+/gi,
      (_, label) => `${label}=[redacted]`
    );
}

export async function POST(request: Request) {
  // Customer Account Brief Generator API route.
  const body = (await request.json()) as BriefPayload;

  if (!body.accountName) {
    return NextResponse.json(
      { status: 'error', error: 'Account name is required.' } satisfies BriefResponse,
      { status: 400 }
    );
  }

  let salesforce: SalesforceBrief;

  const includeActivity = Boolean(body.includeActivity);
  const activityDays = Number(body.activityDays ?? 90);
  const includePublic = Boolean(body.includePublic);

  const cookieStore = cookies();
  const auth = readAuth(cookieStore);

  if (!auth && process.env.MOCK_MODE !== 'true') {
    return NextResponse.json(
      { status: 'error', error: 'Salesforce connection required.' } satisfies BriefResponse,
      { status: 401 }
    );
  }

  let refreshedAuth = auth;
  if (auth && needsRefresh(auth)) {
    try {
      refreshedAuth = await refreshAuth(auth);
    } catch (error) {
      const detail =
        process.env.NODE_ENV !== 'production' ? sanitizeErrorMessage(error) : null;
      return NextResponse.json(
        {
          status: 'error',
          error: detail
            ? `Salesforce token refresh failed. ${detail}`
            : 'Salesforce token refresh failed.'
        } satisfies BriefResponse,
        { status: 401 }
      );
    }
  }

  try {
    salesforce = await getSalesforceBrief(
      body.accountName,
      includeActivity,
      activityDays,
      refreshedAuth ?? { accessToken: '', instanceUrl: '' }
    );
  } catch (error) {
    const detail =
      process.env.NODE_ENV !== 'production' ? sanitizeErrorMessage(error) : null;
    const response = NextResponse.json(
      {
        status: 'error',
        error: detail
          ? `Unable to reach Salesforce MCP server. ${detail}`
          : 'Unable to reach Salesforce MCP server.'
      } satisfies BriefResponse,
      { status: 500 }
    );
    return response;
  }

  if (salesforce.status === 'notFound' || salesforce.status === 'needsDisambiguation') {
    return NextResponse.json({
      status: salesforce.status,
      matches: salesforce.matches
    } satisfies BriefResponse);
  }

  let publicContext = null;

  let publicError: string | null = null;
  if (includePublic) {
    try {
      publicContext = await fetchPublicCompanyContext(body.accountName);
    } catch (error) {
      const detail =
        process.env.NODE_ENV !== 'production' ? sanitizeErrorMessage(error) : null;
      publicContext = null;
      publicError = detail ?? 'Public enrichment failed.';
      if (detail) {
        console.warn(`Public enrichment failed: ${detail}`);
      }
    }
  }

  const { merged, publicUnavailable, publicInsights } = mergeBriefData(salesforce, publicContext);
  const briefText = formatBrief(
    merged,
    publicUnavailable && includePublic,
    publicInsights
  );

  const response = NextResponse.json({
    status: 'ok',
    briefText,
    publicError: publicError ?? undefined
  } satisfies BriefResponse);
  if (auth && refreshedAuth && refreshedAuth !== auth) {
    setAuthCookie(response, refreshedAuth);
  }
  return response;
}
