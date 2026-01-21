import type { PublicCompanyContext, SalesforceBrief } from './types';

export const mockSalesforceBrief: SalesforceBrief = {
  status: 'ok',
  accountName: 'Acme Corp',
  segment: 'Enterprise',
  industry: 'Manufacturing',
  companySize: '8,000 employees',
  arrRange: '$250k-$500k',
  notableQualifier: 'Global facilities modernization program',
  engagementSummary: [
    'Evaluating platform consolidation for plant telemetry and predictive maintenance.',
    'Currently in technical validation with security review in progress.',
    'Primary competitors include legacy industrial analytics vendors.'
  ],
  competitiveContext: ['Legacy industrial analytics suites', 'In-house data lake stack'],
  coreTeam: {
    ae: 'Jordan Blake',
    se: 'Riley Chen',
    fieldCto: 'Morgan Patel',
    fde: 'Alex Rivera',
    other: 'Partner: Westline Systems'
  },
  personas: {
    primaryChampion: 'Taylor Brooks, VP Operations',
    technicalStakeholders: 'DevOps Leads, Security Architects - Platform Engineering',
    economicBuyer: 'Jamie Lee, CFO',
    otherInfluencers: 'Plant Managers, OT Security Team'
  },
  demoHighlights: {
    callType: 'Technical deep dive',
    summary: [
      'Reviewed sensor ingestion pipeline and alerting architecture.',
      'Validated integration with existing MES and ERP systems.',
      'Discussed compliance requirements for industrial data retention.'
    ]
  },
  proofPoints: ['Edge ingestion at scale', 'HA architecture across regions', 'SAP and ServiceNow integrations'],
  risks: ['Budget approval pending FY cycle', 'Security questionnaire turnaround time'],
  nextSteps: [
    '2024-10-05: Provide tailored ROI model - AE',
    '2024-10-12: Schedule security workshop - SE',
    '2024-10-20: Decision checkpoint - Customer'
  ],
  activitySummary: [
    'Recent activity includes two discovery calls and a security review kickoff.'
  ]
};

export const mockPublicContext: PublicCompanyContext = {
  company_background:
    'Acme Corp is a global manufacturing leader focused on industrial automation and supply chain optimization. The company is known for modernizing legacy plant operations through digital initiatives.',
  industry: 'Industrial Manufacturing',
  public_company_size_indicator: 'Global enterprise',
  public_competitors: ['Siemens', 'Rockwell Automation', 'Schneider Electric'],
  notable_public_facts: ['Investing in smart factory programs', 'Expanding footprint in EMEA']
};
