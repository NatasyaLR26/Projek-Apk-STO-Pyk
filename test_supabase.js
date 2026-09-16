async function testSupabase() {
  const url = 'https://exparbfaptuooqtjizbw.supabase.co/rest/v1/barang?select=*';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4cGFyYmZhcHR1b29xdGppemJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzk2NzAsImV4cCI6MjEwNDk1NTY3MH0.68VSXVmmzRVTZPm-mLUeFIOcevyX3JlTl9CdT5EEkMg';
  
  const res = await fetch(url, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  console.log('Status:', res.status, res.statusText);
  const data = await res.text();
  console.log('Response:', data);
}

testSupabase().catch(console.error);
