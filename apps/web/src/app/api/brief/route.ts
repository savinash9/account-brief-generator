import { NextResponse } from 'next/server';
import type { BriefPayload, BriefResponse, SalesforceBrief } from '@/lib/types';
import { fetchPublicCompanyContext } from '@/lib/publicEnrichment';
import { formatBrief, mergeBriefData } from '@/lib/briefFormatter';
import { getSalesforceBrief } from '@/lib/mcpClient';

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

  try {
    salesforce = await getSalesforceBrief(body.accountName, includeActivity, activityDays);
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Unable to reach Salesforce MCP server.' } satisfies BriefResponse,
      { status: 500 }
    );
  }

  if (salesforce.status === 'notFound' || salesforce.status === 'needsDisambiguation') {
    return NextResponse.json({
      status: salesforce.status,
      matches: salesforce.matches
    } satisfies BriefResponse);
  }

  let publicContext = null;

  if (includePublic) {
    publicContext = await fetchPublicCompanyContext(body.accountName);
  }

  const { merged, publicUnavailable, publicInsights } = mergeBriefData(salesforce, publicContext);
  const briefText = formatBrief(
    merged,
    publicUnavailable && includePublic,
    publicInsights
  );

  return NextResponse.json({
    status: 'ok',
    briefText
  } satisfies BriefResponse);
}
