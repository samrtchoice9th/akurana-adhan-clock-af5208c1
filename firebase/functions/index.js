const { onSchedule } = require('firebase-functions/v2/scheduler');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

admin.initializeApp();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const VALID_REMINDER_TYPES = new Set(['10min', '5min', 'adhan', 'iqamah']);

const PRAYER_FIELDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

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

  const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const normalizedHour = String(Number(match[1])).padStart(2, '0');
  const normalizedMinute = match[2];
  return `${normalizedHour}:${normalizedMinute}`;
}


  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hhmm: `${map.hour}:${map.minute}`,
  };
}

function normalizeToHHMM(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return null;

  const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const normalizedHour = String(Number(match[1])).padStart(2, '0');
  const normalizedMinute = match[2];
  return `${normalizedHour}:${normalizedMinute}`;
}

function addMinutesToHHMM(hhmmValue, minutesToAdd) {
  const [hour, minute] = hhmmValue.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + minutesToAdd;

  const wrappedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const finalHour = Math.floor(wrappedMinutes / 60);
  const finalMinute = wrappedMinutes % 60;

  return `${String(finalHour).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`;
}


  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hhmm: `${map.hour}:${map.minute}`,
  };
}

function normalizeToHHMM(timeValue) {
  if (!timeValue || typeof timeValue !== 'string') return null;

  const match = timeValue.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const normalizedHour = String(Number(match[1])).padStart(2, '0');
  const normalizedMinute = match[2];
  return `${normalizedHour}:${normalizedMinute}`;
}

function addMinutesToHHMM(hhmmValue, minutesToAdd) {
  const [hour, minute] = hhmmValue.split(':').map(Number);
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

    if (!supabaseUrl || !supabaseServiceRoleKey) {
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

      if (!pushTokenRows || pushTokenRows.length === 0) {
        logger.info('No enabled push tokens found');
        return;
      }

      const candidateNotifications = [];

      for (const pushTokenRow of pushTokenRows) {
        const reminderType = pushTokenRow.reminder_type;
        if (!VALID_REMINDER_TYPES.has(reminderType) || !pushTokenRow.token) {
          continue;
        }

        for (const prayerName of PRAYER_FIELDS) {
          const prayerTimeHHMM = normalizeToHHMM(prayerTimesRow[prayerName]);
          if (!prayerTimeHHMM) continue;

          const targetSendTime = calculateReminderTime(prayerTimeHHMM, reminderType);
          if (!targetSendTime || targetSendTime !== sriLankaCurrentTime) continue;

          const dedupeKey = `${sriLankaDate}:${pushTokenRow.id}:${prayerName}:${reminderType}`;
          candidateNotifications.push({
            dedupeKey,
            tokenRecordId: pushTokenRow.id,
            deviceToken: pushTokenRow.token,
            prayerName,
            reminderType,
          });
        }
      }

      if (candidateNotifications.length === 0) {
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

      if (!pushTokenRows || pushTokenRows.length === 0) {
        logger.info('No enabled push tokens found');
        return;
      }

      const candidateNotifications = [];

      for (const pushTokenRow of pushTokenRows) {
        const reminderType = pushTokenRow.reminder_type;
        if (!['10min', '5min', 'adhan', 'iqamah'].includes(reminderType)) {
          continue;
        }

        for (const prayerName of PRAYER_FIELDS) {
          const prayerTimeHHMM = normalizeToHHMM(prayerTimesRow[prayerName]);
          if (!prayerTimeHHMM) continue;

          const targetSendTime = calculateReminderTime(prayerTimeHHMM, reminderType);
          if (!targetSendTime || targetSendTime !== sriLankaCurrentTime) continue;

          const dedupeKey = `${sriLankaDate}:${pushTokenRow.id}:${prayerName}:${reminderType}`;
          candidateNotifications.push({
            dedupeKey,
            tokenRecordId: pushTokenRow.id,
            deviceToken: pushTokenRow.token,
            prayerName,
            reminderType,
          });
        }
      }

      if (candidateNotifications.length === 0) {
        logger.info('No reminders to send this minute');
        return;
      }

      const dedupeKeys = candidateNotifications.map((notification) => notification.dedupeKey);
      const { data: existingLogRows, error: existingLogsError } = await supabase
        .from('notification_sent_log')
        .select('dedupe_key')
        .in('dedupe_key', dedupeKeys);

      if (existingLogsError) {
        logger.error('Failed to fetch dedupe keys from notification_sent_log', existingLogsError);
        return;
      }

      const alreadySentKeys = new Set((existingLogRows || []).map((row) => row.dedupe_key));
      const notificationsToSend = candidateNotifications.filter(
        (notification) => !alreadySentKeys.has(notification.dedupeKey)
      );

      if (notificationsToSend.length === 0) {
        logger.info('All matching reminders were already sent', {
          candidateCount: candidateNotifications.length,
        });
        return;
      }

      for (const notification of notificationsToSend) {
        try {
          await admin.messaging().send({
            token: notification.deviceToken,
            notification: {
              title: buildNotificationTitle(notification.prayerName, notification.reminderType),
              body: 'Prepare for Salah',
            },
            data: {
              prayer: notification.prayerName,
              reminder_type: notification.reminderType,
              date: sriLankaDate,
            },
          });

          const { error: insertLogError } = await supabase.from('notification_sent_log').insert({
            dedupe_key: notification.dedupeKey,
            token: notification.deviceToken,
            prayer_name: notification.prayerName,
            reminder_type: notification.reminderType,
            sent_at: new Date().toISOString(),
          });

          if (insertLogError) {
            logger.error('Failed to insert notification_sent_log row', {
              error: insertLogError,
              dedupeKey: notification.dedupeKey,
            });
          }
        } catch (error) {
          logger.error('Failed to send FCM reminder', {
            error,
            dedupeKey: notification.dedupeKey,
            tokenRecordId: notification.tokenRecordId,
          });

          if (isTokenNotRegisteredError(error)) {
          const errorCode = error?.code || error?.errorInfo?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'registration-token-not-registered'
          ) {
            const { error: deleteTokenError } = await supabase
              .from('users_push_tokens')
              .delete()
              .eq('id', notification.tokenRecordId);

            if (deleteTokenError) {
              logger.error('Failed to delete invalid push token', {
                error: deleteTokenError,
                tokenRecordId: notification.tokenRecordId,
              });
            } else {
              logger.info('Removed invalid push token', {
                tokenRecordId: notification.tokenRecordId,
              });
            }
          }
        }
      }
    } catch (unhandledError) {
      logger.error('Unhandled error in sendPrayerReminders', unhandledError);
    }
  }
);
