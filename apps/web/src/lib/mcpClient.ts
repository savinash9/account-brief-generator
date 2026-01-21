import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { SalesforceBrief } from './types';
import { mockSalesforceBrief } from './mockData';

const DEFAULT_COMMAND = 'node ../../servers/sfdc-mcp/dist/index.js';

function getCommandParts() {
  const command = process.env.SFDC_MCP_COMMAND ?? DEFAULT_COMMAND;
  const [cmd, ...args] = command.split(' ').filter(Boolean);
  return { cmd, args };
}

export async function getSalesforceBrief(
  accountName: string,
  includeActivity: boolean,
  activityDays: number
): Promise<SalesforceBrief> {
  if (process.env.MOCK_MODE === 'true') {
    return mockSalesforceBrief;
  }

  const { cmd, args } = getCommandParts();
  const transport = new StdioClientTransport({
    command: cmd,
    args
  });
  const client = new Client(
    {
      name: 'customer-account-brief-generator-web',
      version: '1.0.0'
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: 'sfdc.get_account_brief',
      arguments: {
        accountName,
        includeActivity,
        activityDays
      }
    });

    const content = result.content?.[0];
    if (content?.type === 'text') {
      return JSON.parse(content.text) as SalesforceBrief;
    }

    throw new Error('Unexpected MCP response.');
  } finally {
    await client.close();
  }
}
