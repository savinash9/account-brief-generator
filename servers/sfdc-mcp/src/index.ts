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

interface AuthContext {
  accessToken: string;
  instanceUrl: string;
}

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
        limit: { type: 'number', default: 5 },
        auth: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            instanceUrl: { type: 'string' }
          },
          required: ['accessToken', 'instanceUrl']
        }
      },
      required: ['accountName']
    }
  },
  {
    name: 'sfdc.check_auth',
    description: 'Validate Salesforce auth with sanitized error detail.',
    inputSchema: {
      type: 'object',
      properties: {
        auth: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            instanceUrl: { type: 'string' }
          },
          required: ['accessToken', 'instanceUrl']
        }
      },
      required: []
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
        activityDays: { type: 'number', default: 90 },
        auth: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            instanceUrl: { type: 'string' }
          },
          required: ['accessToken', 'instanceUrl']
        }
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
        activityDays: { type: 'number', default: 90 },
        auth: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            instanceUrl: { type: 'string' }
          },
          required: ['accessToken', 'instanceUrl']
        }
      },
      required: ['accountId']
    }
  }
];

function getConnectionWithAuth(auth: AuthContext) {
  return new jsforce.Connection({
    accessToken: auth.accessToken,
    instanceUrl: auth.instanceUrl
  });
}

function sanitizeErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .replace(
      /(password|token|secret|access_token)\s*[:=]\s*\S+/gi,
      (_, label) => `${label}=[redacted]`
    );
}

async function searchAccounts(accountName: string, limit = 5, auth?: AuthContext) {
  if (process.env.MOCK_MODE === 'true') {
    return ['Acme Corp', 'Acme Holdings'];
  }

  if (!auth) {
    throw new Error('Missing Salesforce auth context.');
  }
  const connection = getConnectionWithAuth(auth);

  const records = (await connection.query(
    `SELECT Id, Name FROM Account WHERE Name LIKE '%${accountName.replace(/'/g, "\\'")}%' LIMIT ${limit}`
  )) as { records: { Id: string; Name: string }[] };

  return records.records.map((record: { Name: string }) => record.Name);
}

async function getAccountBriefById(
  accountId: string,
  includeActivity: boolean,
  activityDays: number,
  auth?: AuthContext
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

  if (!auth) {
    throw new Error('Missing Salesforce auth context.');
  }
  const connection = getConnectionWithAuth(auth);

  const accountResult = (await connection.query(
    `SELECT Id, Name, Industry, Type, NumberOfEmployees, Description, Owner.Name FROM Account WHERE Id = '${accountId}' LIMIT 1`
  )) as {
    records: Array<{
      Id: string;
      Name: string;
      Industry?: string;
      Type?: string;
      NumberOfEmployees?: number;
      Description?: string;
      Owner?: { Name?: string };
    }>;
  };

  const account = accountResult.records[0];
  if (!account) {
    return { status: 'notFound' };
  }

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
      ae: account.Owner?.Name ?? 'Unassigned',
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
    const tasks = (await connection.query(
      `SELECT Subject FROM Task WHERE WhatId = '${accountId}' AND ActivityDate >= ${since.toISOString().split('T')[0]} LIMIT 5`
    )) as { records: { Subject: string }[] };
    brief.activitySummary = tasks.records.map((task: { Subject: string }) => task.Subject);
  }

  const oppResult = (await connection.query(
    `SELECT Id FROM Opportunity WHERE AccountId = '${accountId}' ORDER BY LastModifiedDate DESC LIMIT 1`
  )) as { records: Array<{ Id: string }> };

  const mostRecentOppId = oppResult.records[0]?.Id;
  if (mostRecentOppId) {
    const roleResult = (await connection.query(
      `SELECT Contact.Name, Contact.Title, Role FROM OpportunityContactRole WHERE OpportunityId = '${mostRecentOppId}' AND Role = 'Economic Buyer' LIMIT 1`
    )) as {
      records: Array<{ Contact?: { Name?: string; Title?: string }; Role?: string }>;
    };

    const econBuyer = roleResult.records[0];
    if (econBuyer?.Contact?.Name) {
      const title = econBuyer.Contact.Title ? `, ${econBuyer.Contact.Title}` : '';
      brief.personas = {
        ...(brief.personas ?? {}),
        economicBuyer: `${econBuyer.Contact.Name}${title}`
      };
    }
  }

  return brief;
}

async function getAccountBrief(
  accountName: string,
  includeActivity: boolean,
  activityDays: number,
  auth?: AuthContext
): Promise<SalesforceBrief> {
  if (process.env.MOCK_MODE === 'true') {
    return getAccountBriefById('mock', includeActivity, activityDays);
  }

  if (!auth) {
    throw new Error('Missing Salesforce auth context.');
  }
  const connection = getConnectionWithAuth(auth);

  const result = (await connection.query(
    `SELECT Id, Name FROM Account WHERE Name LIKE '%${accountName.replace(/'/g, "\\'")}%' LIMIT 5`
  )) as { records: { Id: string; Name: string }[] };

  if (result.records.length === 0) {
    return { status: 'notFound' };
  }

  if (result.records.length > 1) {
    return {
      status: 'needsDisambiguation',
      matches: result.records.map((record: { Name: string }) => record.Name)
    };
  }

  return getAccountBriefById(result.records[0].Id, includeActivity, activityDays, auth);
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolSchemas
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'sfdc.check_auth': {
      if (process.env.MOCK_MODE === 'true') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ status: 'ok', mock: true }) }]
        };
      }
      const auth = args && typeof args === 'object' ? (args as { auth?: AuthContext }).auth : null;
      if (!auth) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ status: 'error', error: 'Missing auth.' }) }]
        };
      }
      try {
        const connection = getConnectionWithAuth(auth);
        await connection.identity();
        return {
          content: [{ type: 'text', text: JSON.stringify({ status: 'ok' }) }]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                error: sanitizeErrorMessage(error)
              })
            }
          ]
        };
      }
    }
    case 'sfdc.search_accounts': {
      if (!args || typeof args !== 'object') {
        throw new Error('Missing arguments for sfdc.search_accounts.');
      }
      const { accountName, limit, auth } = args as {
        accountName?: string;
        limit?: number;
        auth?: AuthContext;
      };
      if (!accountName) {
        throw new Error('accountName is required.');
      }
      const matches = await searchAccounts(accountName, limit ?? 5, auth);
      return {
        content: [{ type: 'text', text: JSON.stringify({ matches }) }]
      };
    }
    case 'sfdc.get_account_brief': {
      if (!args || typeof args !== 'object') {
        throw new Error('Missing arguments for sfdc.get_account_brief.');
      }
      const { accountName, includeActivity, activityDays, auth } = args as {
        accountName?: string;
        includeActivity?: boolean;
        activityDays?: number;
        auth?: AuthContext;
      };
      if (!accountName) {
        throw new Error('accountName is required.');
      }
      const brief = await getAccountBrief(
        accountName,
        Boolean(includeActivity),
        Number(activityDays ?? 90),
        auth
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(brief) }]
      };
    }
    case 'sfdc.get_account_brief_by_id': {
      if (!args || typeof args !== 'object') {
        throw new Error('Missing arguments for sfdc.get_account_brief_by_id.');
      }
      const { accountId, includeActivity, activityDays, auth } = args as {
        accountId?: string;
        includeActivity?: boolean;
        activityDays?: number;
        auth?: AuthContext;
      };
      if (!accountId) {
        throw new Error('accountId is required.');
      }
      const brief = await getAccountBriefById(
        accountId,
        Boolean(includeActivity),
        Number(activityDays ?? 90),
        auth
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
