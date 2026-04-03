import { NextResponse } from 'next/server';
import { generateAiCommentReaction } from '../../../../lib/ai/comment-reaction-service.js';

export async function POST(request) {
  const payload = await request.json().catch(() => null);
  if (!payload?.commentText || !payload?.language) {
    return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
  }

  try {
    const result = await generateAiCommentReaction(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'generation failed' }, { status: 500 });
  }
}
