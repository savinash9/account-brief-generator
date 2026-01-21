import type { PublicCompanyContext, SalesforceBrief } from './types';

interface MergeResult {
  merged: SalesforceBrief;
  publicUnavailable: boolean;
  publicInsights: string[];
}

export function mergeBriefData(
  salesforce: SalesforceBrief,
  publicContext: PublicCompanyContext | null
): MergeResult {
  const merged: SalesforceBrief = {
    ...salesforce,
    engagementSummary: [...(salesforce.engagementSummary ?? [])],
    competitiveContext: [...(salesforce.competitiveContext ?? [])]
  };

  let publicUnavailable = false;
  const publicInsights: string[] = [];

  if (!publicContext) {
    publicUnavailable = true;
    return { merged, publicUnavailable, publicInsights };
  }

  if (publicContext.company_background) {
    publicInsights.push(publicContext.company_background);
  }

  if (publicContext.notable_public_facts?.length) {
    publicInsights.push(`Notable facts: ${publicContext.notable_public_facts.join('; ')}`);
  }

  if ((merged.industry ?? '').trim().length === 0 && publicContext.industry) {
    merged.industry = publicContext.industry;
  }

  if ((merged.companySize ?? '').trim().length === 0 && publicContext.public_company_size_indicator) {
    merged.companySize = publicContext.public_company_size_indicator;
  }

  if ((merged.competitiveContext ?? []).length === 0 && publicContext.public_competitors?.length) {
    merged.competitiveContext = publicContext.public_competitors;
  }

  return { merged, publicUnavailable, publicInsights };
}

export function formatBrief(
  brief: SalesforceBrief,
  publicUnavailable: boolean,
  publicInsights: string[]
): string {
  const accountName = brief.accountName ?? 'Unknown Account';
  const segment = brief.segment ?? 'Segment Unavailable';
  const industry = brief.industry ?? 'Industry Unavailable';
  const sizeOrArr = brief.companySize ?? brief.arrRange ?? 'Size Unavailable';
  const qualifier = brief.notableQualifier ?? 'Qualifier Unavailable';

  const engagementLines = [...(brief.engagementSummary ?? []), ...publicInsights];
  if (brief.activitySummary?.length) {
    engagementLines.push(`Recent activity: ${brief.activitySummary.join('; ')}`);
  }

  if (publicUnavailable) {
    engagementLines.push('Public context: Unavailable.');
  }

  const engagementText =
    engagementLines.length > 0
      ? engagementLines.join('\n')
      : 'Engagement context not yet documented.';

  const competitiveContext = (brief.competitiveContext ?? []).join(', ') || 'None noted.';

  const coreTeam = brief.coreTeam ?? {};
  const personas = brief.personas ?? {};
  const demoHighlights = brief.demoHighlights ?? {};

  const proofPoints = brief.proofPoints?.length ? brief.proofPoints : ['None documented.'];
  const risks = brief.risks?.length ? brief.risks : ['None documented.'];
  const nextSteps = brief.nextSteps?.length ? brief.nextSteps : ['TBD: Align on next steps.'];

  const demoSummary = demoHighlights.summary?.length
    ? demoHighlights.summary.join('\n')
    : 'No demo summary available.';

  return `${accountName} - ${segment}
Company Background & Engagement Context: ${industry} | ${sizeOrArr} | ${qualifier}

${engagementText}
Competitive context: ${competitiveContext}

Core Sales Team:
AE: ${coreTeam.ae ?? 'Unassigned'}, SE: ${coreTeam.se ?? 'Unassigned'}, Field CTO: ${coreTeam.fieldCto ?? 'N/A'}, FDE: ${coreTeam.fde ?? 'N/A'}, Other: ${coreTeam.other ?? 'N/A'}

Key Customer Personas:
Primary Champion: ${personas.primaryChampion ?? 'Unidentified'}
Technical Stakeholders & Personas: ${personas.technicalStakeholders ?? 'Unidentified'}
Economic Buyer: ${personas.economicBuyer ?? 'Unidentified'}
Other Influencers: ${personas.otherInfluencers ?? 'Unidentified'}

Demo/Call Highlights: ${demoHighlights.callType ?? 'Unspecified'}
${demoSummary}

Technical Proof Points Delivered:
- ${proofPoints.join('\n- ')}

Risks/Blockers:
- ${risks.join('\n- ')}

Next Steps & Timeline:
${nextSteps.join('\n')}`;
}
