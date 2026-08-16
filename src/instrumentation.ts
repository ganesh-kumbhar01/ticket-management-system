export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { generateAndSendDailyReport } = await import('@/lib/dailyReportService');
    const { syncInboundEmails } = await import('@/lib/emailSyncService');

    let lastSentDateStr = '';

    // 1. Inbound Email Auto-Syncer: runs on the server every 20 seconds
    setInterval(async () => {
      try {
        await syncInboundEmails();
      } catch (syncErr) {
        console.error('[Server Cron] Inbound email sync error:', syncErr);
      }
    }, 20000);

    // 2. Scheduled 7:00 PM (19:00) IST Daily Operations Report
    setInterval(async () => {
      try {
        const now = new Date();
        const istFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

        const parts = istFormatter.formatToParts(now);
        const hourPart = parts.find((p) => p.type === 'hour')?.value;
        const minutePart = parts.find((p) => p.type === 'minute')?.value;
        const dayPart = parts.find((p) => p.type === 'day')?.value;
        const monthPart = parts.find((p) => p.type === 'month')?.value;
        const yearPart = parts.find((p) => p.type === 'year')?.value;

        const todayIstKey = `${yearPart}-${monthPart}-${dayPart}`;
        const currentHour = parseInt(hourPart || '0', 10);
        const currentMinute = parseInt(minutePart || '0', 10);

        // 7:00 PM IST window
        if (currentHour === 19 && currentMinute >= 0 && currentMinute <= 5) {
          if (lastSentDateStr !== todayIstKey) {
            console.log(`[Auto-Cron] ⏰ 7:00 PM IST reached (${todayIstKey}). Dispatching Daily EOD Operations Report with attached CSV...`);
            lastSentDateStr = todayIstKey;
            const result = await generateAndSendDailyReport();
            console.log('[Auto-Cron] Report Dispatch Result:', result);
          }
        }
      } catch (err) {
        console.error('[Auto-Cron] Error running scheduled daily report check:', err);
      }
    }, 30000);
  }
}
