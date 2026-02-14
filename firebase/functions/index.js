const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

admin.initializeApp();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PRAYER_FIELDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function hhmm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function shiftTime(hhmmValue, minutes) {
  const [h, m] = hhmmValue.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m + minutes, 0, 0);
  return hhmm(d);
}

function targetTimes(prayerTime, reminderType) {
  if (reminderType === '10min') return shiftTime(prayerTime, -10);
  if (reminderType === '5min') return shiftTime(prayerTime, -5);
  if (reminderType === 'adhan') return prayerTime;
  if (reminderType === 'iqamah') return shiftTime(prayerTime, 15);
  return null;
}

exports.sendPrayerReminders = onSchedule('* * * * *', async () => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const current = hhmm(now);

  const { data: prayerRow, error: prayerErr } = await supabase
    .from('daily_prayer_times')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (prayerErr || !prayerRow) {
    logger.error('daily_prayer_times fetch failed', prayerErr);
    return;
  }

  const { data: tokens, error: tokensErr } = await supabase
    .from('users_push_tokens')
    .select('id, token, reminder_type')
    .eq('notifications_enabled', true);

  if (tokensErr || !tokens) {
    logger.error('users_push_tokens fetch failed', tokensErr);
    return;
  }

  const toSend = [];
  for (const t of tokens) {
    for (const prayer of PRAYER_FIELDS) {
      const prayerTime = prayerRow[prayer];
      if (!prayerTime) continue;
      const expected = targetTimes(prayerTime, t.reminder_type);
      if (expected !== current) continue;

      const dedupeKey = `${today}:${t.id}:${prayer}:${t.reminder_type}`;
      const { data: sent } = await supabase
        .from('notification_sent_log')
        .select('id')
        .eq('dedupe_key', dedupeKey)
        .maybeSingle();
      if (sent) continue;

      toSend.push({ token: t.token, prayer, reminder_type: t.reminder_type, dedupeKey });
    }
  }

  for (const msg of toSend) {
    try {
      const title = msg.reminder_type === '5min' ? `${msg.prayer.toUpperCase()} in 5 minutes` : `${msg.prayer.toUpperCase()} reminder`;
      await admin.messaging().send({
        token: msg.token,
        notification: {
          title,
          body: 'Prepare for Sunnah Salah',
        },
        data: {
          prayer: msg.prayer,
          reminder_type: msg.reminder_type,
        },
      });

      await supabase.from('notification_sent_log').insert({
        dedupe_key: msg.dedupeKey,
        token: msg.token,
        prayer_name: msg.prayer,
        reminder_type: msg.reminder_type,
        sent_at: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('FCM send failed', error);
      if (error && error.code === 'messaging/registration-token-not-registered') {
        await supabase.from('users_push_tokens').delete().eq('token', msg.token);
      }
    }
  }
});
