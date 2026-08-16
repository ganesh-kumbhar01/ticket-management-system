export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { generateAndSendDailyReport } = await import('@/lib/dailyReportService');

    let lastSentDateStr = '';

    // Check every 30 seconds for 7:00 PM (19:00) IST trigger
    setInterval(async () => {
      try {
        const now = new Date();
        // Convert to IST (Asia/Kolkata)
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

        // If it is 7:00 PM (19:00) IST and hasn't run today yet
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
