export type BriefStatus = 'ok' | 'notFound' | 'needsDisambiguation' | 'error';

export interface PublicCompanyContext {
  company_background: string | null;
  industry: string | null;
  public_company_size_indicator: string | null;
  public_competitors: string[] | null;
  notable_public_facts: string[] | null;
}

export interface SalesforceBrief {
  status: BriefStatus;
  accountName?: string;
  segment?: string;
  industry?: string;
  companySize?: string;
  arrRange?: string;
  notableQualifier?: string;
  engagementSummary?: string[];
  competitiveContext?: string[];
  coreTeam?: {
    ae?: string;
    se?: string;
    fieldCto?: string;
    fde?: string;
    other?: string;
  };
  personas?: {
    primaryChampion?: string;
    technicalStakeholders?: string;
    economicBuyer?: string;
    otherInfluencers?: string;
  };
  demoHighlights?: {
    callType?: string;
    summary?: string[];
  };
  proofPoints?: string[];
  risks?: string[];
  nextSteps?: string[];
  activitySummary?: string[];
  matches?: string[];
}

export interface BriefResponse {
  status: BriefStatus;
  briefText?: string;
  error?: string;
  matches?: string[];
  publicError?: string;
}

export interface BriefPayload {
  accountName: string;
  includePublic: boolean;
  includeActivity: boolean;
  activityDays: number;
}
