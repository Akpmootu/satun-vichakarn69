import { createClient } from '@supabase/supabase-js';

// ⚠️ สำคัญ: ในการใช้งานจริง ควรเก็บไว้ใน .env file
// Project ID: qjkdjwqgnvfcfjsxjjpu (ดึงมาจาก Anon Key ของคุณ)

const SUPABASE_URL = 'https://qjkdjwqgnvfcfjsxjjpu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqa2Rqd3FnbnZmY2Zqc3hqanB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3Njg3OTYsImV4cCI6MjA4NjM0NDc5Nn0.rCYF0Xm_OG5pYEClAwjYrb8bMCi9R-UoWkpn_DtIhyM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);