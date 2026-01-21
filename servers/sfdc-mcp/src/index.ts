import 'dotenv/config';
import jsforce from 'jsforce';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Customer Account Brief Generator MCP server identifier.
const appName = 'Customer Account Brief Generator';

type BriefStatus = 'ok' | 'notFound' | 'needsDisambiguation' | 'error';

interface SalesforceBrief {
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

const server = new Server(
  {
    name: 'sfdc-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const toolSchemas = [
  {
    name: 'sfdc.search_accounts',
    description: 'Search Salesforce accounts by name.',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string' },
        limit: { type: 'number', default: 5 }
      },
      required: ['accountName']
    }
  },
  {
    name: 'sfdc.get_account_brief',
    description: 'Return a normalized Salesforce account brief by name.',
    inputSchema: {
      type: 'object',
      properties: {
        accountName: { type: 'string' },
        includeActivity: { type: 'boolean' },
        activityDays: { type: 'number', default: 90 }
      },
      required: ['accountName']
    }
  },
  {
    name: 'sfdc.get_account_brief_by_id',
    description: 'Return a normalized Salesforce account brief by account id.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        includeActivity: { type: 'boolean' },
        activityDays: { type: 'number', default: 90 }
      },
      required: ['accountId']
    }
  }
];

function getConnection() {
  const oauth2 = new jsforce.OAuth2({
    loginUrl: process.env.SFDC_LOGIN_URL,
    clientId: process.env.SFDC_CLIENT_ID,
    clientSecret: process.env.SFDC_CLIENT_SECRET,
    redirectUri: 'http://localhost'
  });

  return new jsforce.Connection({ oauth2 });
}

async function login(connection: jsforce.Connection) {
  if (
    !process.env.SFDC_USERNAME ||
    !process.env.SFDC_PASSWORD ||
    !process.env.SFDC_SECURITY_TOKEN
  ) {
    throw new Error('Missing Salesforce credentials.');
  }

  const password = `${process.env.SFDC_PASSWORD}${process.env.SFDC_SECURITY_TOKEN}`;
  await connection.login(process.env.SFDC_USERNAME, password);
}

async function searchAccounts(accountName: string, limit = 5) {
  if (process.env.MOCK_MODE === 'true') {
    return ['Acme Corp', 'Acme Holdings'];
  }

  const connection = getConnection();
  await login(connection);

  const records = await connection.query<{ Id: string; Name: string }>(
    `SELECT Id, Name FROM Account WHERE Name LIKE '%${accountName.replace(/'/g, "\\'")}%' LIMIT ${limit}`
  );

  return records.records.map((record) => record.Name);
}

async function getAccountBriefById(
  accountId: string,
  includeActivity: boolean,
  activityDays: number
): Promise<SalesforceBrief> {
  if (process.env.MOCK_MODE === 'true') {
    return {
      status: 'ok',
      accountName: 'Acme Corp',
      segment: 'Enterprise',
      industry: 'Manufacturing',
      companySize: '8,000 employees',
      arrRange: '$250k-$500k',
      notableQualifier: 'Global facilities modernization program',
      engagementSummary: [
        'Evaluating platform consolidation for plant telemetry and predictive maintenance.',
        'Currently in technical validation with security review in progress.'
      ],
      competitiveContext: ['Legacy industrial analytics suites'],
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
          'Validated integration with existing MES and ERP systems.'
        ]
      },
      proofPoints: ['Edge ingestion at scale', 'HA architecture across regions', 'SAP integration'],
      risks: ['Budget approval pending FY cycle'],
      nextSteps: ['2024-10-05: Provide tailored ROI model - AE'],
      activitySummary: includeActivity
        ? [`Activity summary for last ${activityDays} days available in Salesforce.`]
        : []
    };
  }

  const connection = getConnection();
  await login(connection);

  const account = await connection
    .sobject('Account')
    .retrieve<{
      Id: string;
      Name: string;
      Industry?: string;
      Type?: string;
      NumberOfEmployees?: number;
      Description?: string;
    }>(accountId);

  const brief: SalesforceBrief = {
    status: 'ok',
    accountName: account.Name,
    segment: account.Type ?? 'Unspecified',
    industry: account.Industry ?? 'Unspecified',
    companySize: account.NumberOfEmployees
      ? `${account.NumberOfEmployees.toLocaleString()} employees`
      : 'Unspecified',
    arrRange: 'Unspecified',
    notableQualifier: 'Salesforce account context',
    engagementSummary: account.Description ? [account.Description] : [],
    competitiveContext: [],
    coreTeam: {
      ae: 'Unassigned',
      se: 'Unassigned',
      fieldCto: 'N/A',
      fde: 'N/A',
      other: 'N/A'
    },
    personas: {
      primaryChampion: 'Unidentified',
      technicalStakeholders: 'Unidentified',
      economicBuyer: 'Unidentified',
      otherInfluencers: 'Unidentified'
    },
    demoHighlights: {
      callType: 'Unspecified',
      summary: ['No demo summary captured yet.']
    },
    proofPoints: ['None documented.'],
    risks: ['None documented.'],
    nextSteps: ['TBD: Align on next steps.'],
    activitySummary: []
  };

  if (includeActivity) {
    const since = new Date();
    since.setDate(since.getDate() - activityDays);
    const tasks = await connection.query<{ Subject: string }>(
      `SELECT Subject FROM Task WHERE WhatId = '${accountId}' AND ActivityDate >= ${since.toISOString().split('T')[0]} LIMIT 5`
    );
    brief.activitySummary = tasks.records.map((task) => task.Subject);
  }

  return brief;
}

async function getAccountBrief(
  accountName: string,
  includeActivity: boolean,
  activityDays: number
): Promise<SalesforceBrief> {
  if (process.env.MOCK_MODE === 'true') {
    return getAccountBriefById('mock', includeActivity, activityDays);
  }

  const connection = getConnection();
  await login(connection);

  const result = await connection.query<{ Id: string; Name: string }>(
    `SELECT Id, Name FROM Account WHERE Name LIKE '%${accountName.replace(/'/g, "\\'")}%' LIMIT 5`
  );

  if (result.records.length === 0) {
    return { status: 'notFound' };
  }

  if (result.records.length > 1) {
    return {
      status: 'needsDisambiguation',
      matches: result.records.map((record) => record.Name)
    };
  }

  return getAccountBriefById(result.records[0].Id, includeActivity, activityDays);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolSchemas
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'sfdc.search_accounts': {
      const matches = await searchAccounts(args.accountName as string, args.limit as number);
      return {
        content: [{ type: 'text', text: JSON.stringify({ matches }) }]
      };
    }
    case 'sfdc.get_account_brief': {
      const brief = await getAccountBrief(
        args.accountName as string,
        Boolean(args.includeActivity),
        Number(args.activityDays ?? 90)
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(brief) }]
      };
    }
    case 'sfdc.get_account_brief_by_id': {
      const brief = await getAccountBriefById(
        args.accountId as string,
        Boolean(args.includeActivity),
        Number(args.activityDays ?? 90)
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(brief) }]
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${appName} MCP server ready.`);
}

main().catch((error) => {
  console.error('Failed to start MCP server.');
  if (error instanceof Error) {
    console.error(error.message);
  }
  process.exit(1);
});
