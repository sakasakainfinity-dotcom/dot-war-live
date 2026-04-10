import { buildReactionUserPrompt, EN_REACTION_SYSTEM_PROMPT, JA_REACTION_SYSTEM_PROMPT } from './comment-reaction-prompts.js';

const DEFAULT_TEXT_MODEL = 'gpt-4.1-mini';

function sanitizeSingleSentence(text) {
  const oneLine = `${text ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!oneLine) return '';
  const firstSentence = oneLine.split(/(?<=[。.!?！？])/u)[0] || oneLine;
  return firstSentence.trim();
}

function trimByLanguage(text, language) {
  if (language === 'ja') return text.length > 46 ? `${text.slice(0, 45)}…` : text;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 14) return `${words.slice(0, 14).join(' ')}...`;
  return text;
}

function looksUnsafe(text) {
  return /(kill|die|差別|暴力|sex|doxx|住所|電話番号)/i.test(`${text ?? ''}`);
}

export function chooseVoiceForLanguage(language) {
  return language === 'en' ? 'verse' : 'alloy';
}

export async function buildAiReply(input) {
  if (looksUnsafe(input.commentText)) {
    return { skipped: true, reason: 'unsafe_comment' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { skipped: true, reason: 'missing_api_key' };

  const model = process.env.OPENAI_MODEL_TEXT || DEFAULT_TEXT_MODEL;
  const systemPrompt = input.language === 'ja' ? JA_REACTION_SYSTEM_PROMPT : EN_REACTION_SYSTEM_PROMPT;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      max_output_tokens: 80,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
        { role: 'user', content: [{ type: 'input_text', text: buildReactionUserPrompt(input) }] },
      ],
    }),
  });
  if (!response.ok) return { skipped: true, reason: `openai_failed_${response.status}` };
  const data = await response.json();

  const rawText = data.output_text || '';
  const sanitized = trimByLanguage(sanitizeSingleSentence(rawText), input.language);
  if (!sanitized) return { skipped: true, reason: 'empty_response' };

  return {
    skipped: false,
    result: {
      sourceMessageId: input.messageId,
      sourceUserId: input.userId,
      sourceUserName: input.userName,
      sourceText: input.commentText,
      language: input.language,
      voice: chooseVoiceForLanguage(input.language),
      replyText: sanitized,
      createdAt: new Date().toISOString(),
      status: 'queued',
      kind: 'ai_reply',
    },
  };
}

export async function generateAiCommentReaction(input) {
  return buildAiReply(input);
}
