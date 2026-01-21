# Customer Account Brief Generator

Customer Account Brief Generator is a small, production-ready web app plus a Salesforce MCP server that generates a structured customer account brief from Salesforce data and (optionally) public company context via ChatGPT.

## Monorepo Structure

- `apps/web`: Next.js 14 App Router web application
- `servers/sfdc-mcp`: Salesforce MCP server (Node.js + TypeScript)

## Prerequisites

- Node.js 18+
- A Salesforce Connected App
- An OpenAI API key (for optional public enrichment)

## Environment Variables

Create `.env.local` in `apps/web`:

```
NEXT_PUBLIC_APP_NAME="Customer Account Brief Generator"
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
SFDC_MCP_COMMAND="node ../../servers/sfdc-mcp/dist/index.js"
MOCK_MODE=true
```

Create `.env` in `servers/sfdc-mcp`:

```
SFDC_LOGIN_URL=https://login.salesforce.com
SFDC_CLIENT_ID=...
SFDC_CLIENT_SECRET=...
SFDC_USERNAME=...
SFDC_PASSWORD=...
SFDC_SECURITY_TOKEN=...
MOCK_MODE=true
```

> Tip: Set `MOCK_MODE=true` to mock both Salesforce and ChatGPT calls for local development.

## Salesforce Connected App Setup

1. Create a Connected App in Salesforce.
2. Enable OAuth and select the following scopes:
   - `api`
   - `refresh_token`
3. Add `http://localhost` as a callback URL (or your preferred URL).
4. Copy the Client ID and Client Secret into the MCP server `.env`.

## OpenAI API Setup

1. Create an OpenAI API key.
2. Add `OPENAI_API_KEY` to `apps/web/.env.local`.
3. (Optional) Set `OPENAI_MODEL` to change the chat completion model.

## Running Locally

Install dependencies at the repo root:

```
npm install
```

Build the MCP server (required for non-mock mode):

```
npm run build --workspace servers/sfdc-mcp
```

Start the MCP server:

```
npm run dev --workspace servers/sfdc-mcp
```

Start the web app:

```
npm run dev --workspace apps/web
```

Then open `http://localhost:3000`.

## Mock Mode

Set `MOCK_MODE=true` in both `apps/web/.env.local` and `servers/sfdc-mcp/.env` to:

- Mock Salesforce responses
- Mock ChatGPT public enrichment responses

