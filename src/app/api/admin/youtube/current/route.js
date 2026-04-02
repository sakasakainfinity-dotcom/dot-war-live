import { NextResponse } from 'next/server';
import { checkAdminRequest } from '../../../../../lib/server/adminAuth';
import { readCurrentStreamSettings } from '../../../../../lib/server/streamSettingsStore';

export async function GET(request) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  }

  try {
    const current = await readCurrentStreamSettings();
    return NextResponse.json({
      ok: true,
      current: current || {
        current_video_id: '',
        current_live_chat_id: '',
        updated_at: null,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
