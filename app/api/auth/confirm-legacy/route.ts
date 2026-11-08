import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, isServerSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();

    if (!email || !isServerSupabaseConfigured()) {
      return NextResponse.json({ success: false });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ success: false });
    }

    const { data: usersData } = await adminClient.auth.admin.listUsers();
    const userToConfirm = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (userToConfirm) {
      await adminClient.auth.admin.updateUserById(userToConfirm.id, {
        email_confirm: true,
      });
      return NextResponse.json({ success: true, confirmed: true });
    }

    return NextResponse.json({ success: false });
  } catch {
    return NextResponse.json({ success: false });
  }
}
