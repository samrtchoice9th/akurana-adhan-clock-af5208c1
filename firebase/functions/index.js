const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

admin.initializeApp();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const VALID_REMINDER_TYPES = new Set(['10min', '5min', 'adhan', 'iqamah']);
const PRAYER_FIELDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

let supabase = null;
if (supabaseUrl && supabaseServiceRoleKey) {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getColomboDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SRI_LANKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hhmm: `${map.hour}:${map.minute}`,
  };
}

function normalizeToHHMM(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return null;

  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59 || hour > 23 || hour < 0) return null;

  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;

  if (hour > 23) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function addMinutesToHHMM(hhmmValue, minutesToAdd) {
  const [hour, minute] = hhmmValue.split(':').map(Number);
  if ([hour, minute].some((value) => Number.isNaN(value))) return null;

  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const finalHour = Math.floor(wrappedMinutes / 60);
  const finalMinute = wrappedMinutes % 60;

  return `${String(finalHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
}

function calculateReminderTime(prayerTimeHHMM, reminderType) {
  if (reminderType === '10min') return addMinutesToHHMM(prayerTimeHHMM, -10);
  if (reminderType === '5min') return addMinutesToHHMM(prayerTimeHHMM, -5);
  if (reminderType === 'adhan') return prayerTimeHHMM;
  if (reminderType === 'iqamah') return addMinutesToHHMM(prayerTimeHHMM, 15);
  return null;
}

function isTokenNotRegisteredError(error) {
  const errorCode = error?.code || error?.errorInfo?.code;
  const errorMessage = String(error?.message || error?.errorInfo?.message || '').toLowerCase();

  return (
    errorCode === 'messaging/registration-token-not-registered' ||
    errorCode === 'registration-token-not-registered' ||
    errorMessage.includes('registration token is not registered') ||
    errorMessage.includes('requested entity was not found')
  );
}

function buildNotificationTitle(prayerName, reminderType) {
  const formattedPrayer = prayerName.charAt(0).toUpperCase() + prayerName.slice(1);

  if (reminderType === '10min') return `${formattedPrayer} in 10 minutes`;
  if (reminderType === '5min') return `${formattedPrayer} in 5 minutes`;
  if (reminderType === 'adhan') return `${formattedPrayer} Adhan time`;
  if (reminderType === 'iqamah') return `${formattedPrayer} Iqamah reminder`;

  return `${formattedPrayer} reminder`;
}

exports.sendPrayerReminders = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: SRI_LANKA_TIMEZONE,
  },
  async () => {
    const { date: sriLankaDate, hhmm: sriLankaCurrentTime } = getColomboDateTimeParts();

    logger.info('Prayer reminder tick', {
      date: sriLankaDate,
      time: sriLankaCurrentTime,
      timeZone: SRI_LANKA_TIMEZONE,
    });

    if (!supabase) {
      logger.error('Missing Supabase environment variables', {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
      });
      return;
    }

    try {
      const { data: prayerTimesRow, error: prayerTimesError } = await supabase
        .from('daily_prayer_times')
        .select('date, fajr, dhuhr, asr, maghrib, isha')
        .eq('date', sriLankaDate)
        .maybeSingle();

      if (prayerTimesError) {
        logger.error('Failed to fetch daily prayer times', prayerTimesError);
        return;
      }

      if (!prayerTimesRow) {
        logger.warn('No prayer times found for date', { date: sriLankaDate });
        return;
      }

      const { data: pushTokenRows, error: pushTokensError } = await supabase
        .from('users_push_tokens')
        .select('id, token, reminder_type')
        .eq('notifications_enabled', true);

      if (pushTokensError) {
        logger.error('Failed to fetch user push tokens', pushTokensError);
        return;
      }

      if (!pushTokenRows?.length) {
        logger.info('No enabled push tokens found');
        return;
      }

      const candidateNotifications = [];

      for (const pushTokenRow of pushTokenRows) {
        const reminderType = pushTokenRow.reminder_type;
        if (!VALID_REMINDER_TYPES.has(reminderType) || !pushTokenRow.token) continue;

        for (const prayerName of PRAYER_FIELDS) {
          const prayerTimeHHMM = normalizeToHHMM(prayerTimesRow[prayerName]);
          if (!prayerTimeHHMM) continue;

          const targetSendTime = calculateReminderTime(prayerTimeHHMM, reminderType);
          if (!targetSendTime || targetSendTime !== sriLankaCurrentTime) continue;

          candidateNotifications.push({
            dedupeKey: `${sriLankaDate}:${pushTokenRow.id}:${prayerName}:${reminderType}`,
            tokenRecordId: pushTokenRow.id,
            deviceToken: pushTokenRow.token,
            prayerName,
            reminderType,
          });
        }
      }

      if (!candidateNotifications.length) {
        logger.info('No reminders to send this minute');
        return;
      }

      const dedupeKeys = [...new Set(candidateNotifications.map((notification) => notification.dedupeKey))];
      const { data: existingLogRows, error: existingLogsError } = await supabase
        .from('notification_sent_log')
        .select('dedupe_key')
        .in('dedupe_key', dedupeKeys);

      if (existingLogsError) {
        logger.error('Failed to fetch dedupe keys from notification_sent_log', existingLogsError);
        return;
      }

      const sentDedupeKeys = new Set((existingLogRows || []).map((row) => row.dedupe_key));
      const notificationsToSend = candidateNotifications.filter((notification) => !sentDedupeKeys.has(notification.dedupeKey));

      if (!notificationsToSend.length) {
        logger.info('All candidate notifications already sent');
        return;
      }

      const sentLogRows = [];
      const invalidTokenRecordIds = [];

      for (const notification of notificationsToSend) {
        try {
          await admin.messaging().send({
            token: notification.deviceToken,
            notification: {
              title: buildNotificationTitle(notification.prayerName, notification.reminderType),
              body: 'Akurana Prayer Time Reminder',
            },
            data: {
              prayerName: notification.prayerName,
              reminderType: notification.reminderType,
              date: sriLankaDate,
            },
          });

          sentLogRows.push({
            token_id: notification.tokenRecordId,
            prayer_name: notification.prayerName,
            reminder_type: notification.reminderType,
            sent_at: new Date().toISOString(),
            dedupe_key: notification.dedupeKey,
          });
        } catch (sendError) {
          if (isTokenNotRegisteredError(sendError)) {
            invalidTokenRecordIds.push(notification.tokenRecordId);
            logger.warn('Push token is no longer valid, scheduling deletion', {
              tokenRecordId: notification.tokenRecordId,
              prayerName: notification.prayerName,
              reminderType: notification.reminderType,
            });
            continue;
          }

          logger.error('Failed to send push reminder', {
            tokenRecordId: notification.tokenRecordId,
            prayerName: notification.prayerName,
            reminderType: notification.reminderType,
            error: sendError,
          });
        }
      }

      if (sentLogRows.length) {
        const { error: insertLogError } = await supabase.from('notification_sent_log').insert(sentLogRows);
        if (insertLogError) {
          logger.error('Failed to persist notification sent log entries', insertLogError);
        }
      }

      if (invalidTokenRecordIds.length) {
        const dedupedInvalidTokenIds = [...new Set(invalidTokenRecordIds)];
        const { error: deleteError } = await supabase
          .from('users_push_tokens')
          .delete()
          .in('id', dedupedInvalidTokenIds);

        if (deleteError) {
          logger.error('Failed to delete invalid token records', deleteError);
        }
      }

      logger.info('Prayer reminder run completed', {
        candidates: candidateNotifications.length,
        attempted: notificationsToSend.length,
        sent: sentLogRows.length,
        invalidTokenCount: invalidTokenRecordIds.length,
      });
    } catch (unhandledError) {
      logger.error('Unhandled error in sendPrayerReminders', unhandledError);
    }
  }
);
