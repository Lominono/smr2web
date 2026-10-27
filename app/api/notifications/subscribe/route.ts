import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, p256dh, auth, userId, userAgent } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { success: false, error: 'Endpoint, p256dh y auth son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (supabase) {
      const { error } = await supabase.from('push_subscriptions').upsert(
        [
          {
            endpoint,
            p256dh,
            auth,
            user_id: userId || null,
            user_agent: userAgent || null,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'endpoint' }
      );

      if (error) {
        console.warn('Error upserting push subscription in Supabase:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in /api/notifications/subscribe:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
