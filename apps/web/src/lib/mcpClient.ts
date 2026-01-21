import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs';
import path from 'node:path';
import type { SalesforceBrief } from './types';
import type { SfdcAccessContext } from './sfdcAuth';
import { mockSalesforceBrief } from './mockData';

const DEFAULT_COMMAND = 'node servers/sfdc-mcp/dist/index.js';

function resolveRepoRoot() {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '..', '..')
  ];

  for (const candidate of candidates) {
    const mcpDir = path.join(candidate, 'servers', 'sfdc-mcp');
    if (fs.existsSync(mcpDir)) {
      return candidate;
    }
  }

  return process.cwd();
}

function getCommandParts(repoRoot: string) {
  const command = process.env.SFDC_MCP_COMMAND ?? DEFAULT_COMMAND;
  const [cmd, ...args] = command.split(' ').filter(Boolean);
  if (cmd === 'node' && args.length > 0 && !path.isAbsolute(args[0])) {
    args[0] = path.resolve(repoRoot, args[0]);
  }
  return { cmd, args };
}

export async function getSalesforceBrief(
  accountName: string,
  includeActivity: boolean,
  activityDays: number,
  auth: SfdcAccessContext
): Promise<SalesforceBrief> {
  if (process.env.MOCK_MODE === 'true') {
    return mockSalesforceBrief;
  }

  const repoRoot = resolveRepoRoot();
  const { cmd, args } = getCommandParts(repoRoot);
  const mcpCwd = path.resolve(repoRoot, 'servers', 'sfdc-mcp');
  const transport = new StdioClientTransport({
    command: cmd,
    args,
    cwd: mcpCwd
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
        activityDays,
        auth
      }
    });

    const content = (result as { content?: Array<{ type: string; text: string }> }).content?.[0];
    if (content?.type === 'text') {
      return JSON.parse(content.text) as SalesforceBrief;
    }

    throw new Error('Unexpected MCP response.');
  } finally {
    await client.close();
  }
}
