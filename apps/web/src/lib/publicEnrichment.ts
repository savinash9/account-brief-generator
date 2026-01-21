import type { PublicCompanyContext } from './types';
import { mockPublicContext } from './mockData';

const promptTemplate = `You are a research assistant. Provide only public, non-confidential information.
Company: {{ACCOUNT_NAME}}

Return a concise JSON object with:
- company_background (2–3 sentences)
- industry
- public_company_size_indicator (e.g., ‘10k+ employees’, ‘Public company’, ‘Regional enterprise’)
- public_competitors (array, max 5)
- notable_public_facts (array, max 3)

If information is unclear or not confidently public, return null for that field.
Do not speculate.`;

export async function fetchPublicCompanyContext(
  accountName: string
): Promise<PublicCompanyContext | null> {
  if (process.env.MOCK_MODE === 'true') {
    return mockPublicContext;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  const prompt = promptTemplate.replace('{{ACCOUNT_NAME}}', accountName);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content) as PublicCompanyContext;
    return parsed;
  } catch (error) {
    return null;
  }
}
