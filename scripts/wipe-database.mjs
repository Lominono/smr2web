import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1].trim()] = val;
    }
  }
  return env;
}

const env = {
  ...loadEnvFile('.env.local'),
  ...loadEnvFile('.env.production.local'),
  ...loadEnvFile('.env.pulled.local'),
};

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);
console.log('Using key length:', serviceKey ? serviceKey.length : 0);

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function wipe() {
  console.log('--- Wiping Supabase Auth Users ---');
  try {
    const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.warn('Error listing auth users:', listErr.message);
    } else if (usersData?.users) {
      console.log(`Found ${usersData.users.length} auth users.`);
      for (const u of usersData.users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) console.warn(`Failed to delete user ${u.id}:`, delErr.message);
        else console.log(`Deleted user ${u.id} (${u.email})`);
      }
    }
  } catch (err) {
    console.warn('Auth admin wipe error:', err.message);
  }

  const tables = [
    'chat_message_likes',
    'chat_messages',
    'messages',
    'conversations',
    'comments',
    'comment_reactions',
    'likes_posts',
    'post_likes',
    'post_votes',
    'posts',
    'chismes',
    'notifications',
    'push_subscriptions',
    'notification_preferences',
    'user_activity',
    'user_cosmetics',
    'user_auras',
    'anchoa_tx',
    'faro_wheel_spins',
    'faro_poll_votes',
    'faro_polls',
    'faro_proposal_votes',
    'faro_proposals',
    'cookie_consent_logs',
    'rate_limits',
    'admin_audit_logs',
    'admin_actions',
    'follows',
    'blocked_users',
    'profiles',
    'perfiles',
    'rr_turns',
    'rr_room_players',
    'rr_games',
    'rr_rooms',
    'community_feedback',
    'feedback_votes',
    'transactions',
    'investments',
    'price_history',
    'balance_transactions'
  ];

  console.log('--- Wiping Tables ---');
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        const { error: err2 } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
        if (!err2) {
          console.log(`Wiped table: ${table}`);
        }
      } else {
        console.log(`Wiped table: ${table}`);
      }
    } catch (e) {
      // ignore
    }
  }

  console.log('--- Database Wipe Complete! ---');
}

wipe();
