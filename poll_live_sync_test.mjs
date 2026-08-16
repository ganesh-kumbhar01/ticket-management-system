async function poll() {
  const url = 'https://ticket-management-system-3fy5.vercel.app/api/sync-test';
  console.log('Polling', url, '...');
  
  for (let i = 1; i <= 8; i++) {
    console.log(`\n--- ATTEMPT ${i} ---`);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      console.log('HTTP Status:', res.status);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log('Live Sync Test Response:', JSON.stringify(json, null, 2));
        if (res.status === 200 && json.success) {
          console.log('✅ LIVE SYNC SUCCESSFUL ON VERCEL!');
          return;
        }
      } catch (parseErr) {
        console.log('Raw text output:', text.slice(0, 300));
      }
    } catch (err) {
      console.error('Fetch error:', err.message);
    }
    await new Promise((r) => setTimeout(r, 8000));
  }
}

poll().catch(console.error);
