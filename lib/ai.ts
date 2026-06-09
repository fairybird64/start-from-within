import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function reflectPlayerInput(playerInput: string, cardQuestion: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror. Your ONLY job is to reflect back what the person said in 1-2 sentences. Do NOT analyze, interpret, diagnose, give advice, or add new content. Only echo what they shared in warm, gentle language.

Card question (for context only): "${cardQuestion}"
What the person wrote: "${playerInput}"

Reflect back in Thai language, 1-2 sentences only.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function summarizeSession(entries: Array<{ question: string; answer: string }>): Promise<string> {
  const entriesText = entries
    .map((e, i) => `${i + 1}. คำถาม: "${e.question}"\nคำตอบ: "${e.answer}"`)
    .join('\n\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror. Your ONLY job is to summarize what the person shared in this session — using ONLY their own words and themes. Do NOT analyze, interpret, diagnose, give advice, or add any new content.

Here is what the person shared:
${entriesText}

Write a warm, gentle summary in Thai language (3-5 sentences) that reflects back what they expressed. Use their words. Add nothing new.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
