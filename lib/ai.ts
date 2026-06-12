import Anthropic from '@anthropic-ai/sdk';
import type { IcebergLayer, CopingStance } from './types';

const VALID_LAYERS: IcebergLayer[] = [
  'behavior', 'coping', 'feelings', 'feelings_about_feelings',
  'perceptions', 'expectations', 'yearnings', 'self',
];

const COPING_STANCE_LABELS: Record<CopingStance, string> = {
  placating: 'ยอมตาม',
  blaming: 'โทษผู้อื่น',
  super_reasonable: 'มีเหตุผลเกินไป',
  irrelevant: 'เฉไฉ',
};



const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ReflectResult {
  reflection: string;
  suggestedLayer: IcebergLayer | null;
}

// CLINICAL REVIEW REQUIRED
export async function reflectPlayerInput(
  playerInput: string,
  cardQuestion: string,
  currentLayer?: IcebergLayer | null,
  copingStance?: CopingStance | null,
): Promise<ReflectResult> {
  // CLINICAL WORDING — approved by clinical reviewer, do not modify
  const copingContext = (currentLayer === 'coping' && copingStance)
    ? `\nCOPING CONTEXT: The player selected the stance "${COPING_STANCE_LABELS[copingStance]}" (${copingStance}) in the Situation phase. You may reference it ONLY as "ท่าทีที่คุณสังเกตในสถานการณ์นี้" — never as identity ("คุณเป็นคน..."). Frame the stance with gentle caretaking perspective — as if it has been trying to take care of something inside them — e.g. "ได้ยินว่าตอนนั้นคุณใช้ท่าที${COPING_STANCE_LABELS[copingStance]} — ถ้าลองมองท่าทีนี้อย่างอ่อนโยน เหมือนมันกำลังพยายามช่วยดูแลบางอย่างในใจคุณอยู่… คุณคิดว่ามันกำลังช่วยดูแลอะไรให้คุณคะ". Apply this "gentle caretaking" frame consistently across all stances — never use "ปกป้อง" (protect/defend). HARD RULE: never map stance to a specific yearning or need — that is interpretation. Only invite, never conclude.`
    : '';

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror for a therapeutic self-exploration game using Satir's Iceberg Model.
The iceberg layers from surface to core are: behavior → coping → feelings → feelings_about_feelings → perceptions → expectations → yearnings → self.${copingContext}

HARD RULES — never violate:
- Reflect ONLY the player's exact words and vocabulary. Add nothing new.
- Begin with "ได้ยินว่า...", "รับรู้ว่า...", or "ฟังดูเหมือน..." — vary naturally.
- Never say "คุณน่าจะ..." or "ดูเหมือนว่า..."
- Never upgrade vocabulary: if they said "กังวล" echo "กังวล", never "ความวิตกกังวล"
- No diagnosis, analysis, interpretation, or advice.
- Maximum 1 question per response total.
- Never map a coping stance to a specific need or yearning.

SPECIAL CASE — if the player is asking for advice (e.g. "ควรทำยังไง", "ช่วยแนะนำ", "ทำไงดี"):
Set suggestedLayer to null. Respond with exactly this pattern (adapt slightly to their words):
"ได้ยินว่าอยากรู้ว่าควรทำยังไง — เกมนี้ไม่มีคำตอบสำเร็จรูปให้ แต่บ่อยครั้งคำตอบอยู่ลึกลงไปข้างใน อยากลองสำรวจไหมว่าใต้คำถามนี้มีความรู้สึกอะไรอยู่"

NORMAL CASE — respond in JSON only with this exact shape:
{
  "reflection": "<mirror reflection 1-2 sentences using only their words> [optionally: ONE process invitation pointing deeper, with zero new content — only if natural]",
  "suggestedLayer": "<one of: behavior|coping|feelings|feelings_about_feelings|perceptions|expectations|yearnings|self — or null if no invitation given>"
}
The suggestedLayer should be a deeper layer than the current layer (${currentLayer ?? 'unknown'}), or null.
Do not output anything outside the JSON.

Card question (for context only): "${cardQuestion}"
What the person wrote: "${playerInput}"`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('[reflect] Response truncated (stop_reason=max_tokens). Consider raising max_tokens.');
    return { reflection: '', suggestedLayer: null };
  }

  const block = message.content[0];
  if (block.type !== 'text') return { reflection: '', suggestedLayer: null };

  // Strip markdown code fences the model sometimes wraps around JSON
  const raw = block.text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(raw);
    const layer = VALID_LAYERS.includes(parsed.suggestedLayer) ? parsed.suggestedLayer as IcebergLayer : null;
    return { reflection: parsed.reflection ?? '', suggestedLayer: layer };
  } catch {
    // Fallback: plain-text response (advice deflection case or malformed JSON)
    return { reflection: raw, suggestedLayer: null };
  }
}

export async function reflectSessionLayers(sessionContent: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a reflective facilitator. Using ONLY the exact words and phrases the player has written in this session (provided below), reflect back what you heard across the layers they explored. Do not add new words, do not interpret, do not summarize with new concepts, do not upgrade vocabulary. Start with "ได้ยินว่า..." or "รับรู้ว่า...". Maximum 3 sentences. Thai only.

Player's session content:
${sessionContent}`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('[reflect-layers] Response truncated (stop_reason=max_tokens).');
    return '';
  }
  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function summarizeSession(entries: Array<{ question: string; answer: string }>): Promise<string> {
  const entriesText = entries
    .map((e, i) => `${i + 1}. คำถาม: "${e.question}"\nคำตอบ: "${e.answer}"`)
    .join('\n\n');

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a compassionate mirror. Your ONLY job is to reflect back what the person said during this session — using ONLY the exact words and phrases they wrote. Do NOT interpret, analyze, diagnose, add meaning, or introduce any word they did not use.

Rules:
- Begin with "วันนี้คุณพูดถึง..." or "ในการสำรวจวันนี้ คุณบอกว่า..."
- Quote or closely paraphrase the player's own words throughout
- 3-5 complete sentences, warm and gentle in tone
- Never add conclusions, insights, or new meaning — only what they already said
- Never say "คุณน่าจะ..." or "ดูเหมือนว่า..."
- If they said "รู้สึกกังวล" echo "รู้สึกกังวล" — never upgrade to "ความกังวลลึกๆ"
- No diagnosis, analysis, or interpretation of any kind

Here is what the person shared:
${entriesText}`,
      },
    ],
  });

  if (message.stop_reason === 'max_tokens') {
    console.warn('[summarize] Response truncated (stop_reason=max_tokens).');
    return '';
  }
  const block = message.content[0];
  return block.type === 'text' ? block.text : '';
}
