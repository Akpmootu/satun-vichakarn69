fetch('https://qjkdjwqgnvfcfjsxjjpu.supabase.co/rest/v1/')
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
