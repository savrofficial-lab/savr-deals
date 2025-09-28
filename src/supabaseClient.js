// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// 👇 Replace with your real Supabase URL and anon key:
const supabaseUrl = 'https://xjuhzylpgbteuhvjbufg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdWh6eWxwZ2J0ZXVodmpidWZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5ODA0OTksImV4cCI6MjA3NDU1NjQ5OX0.SGAGvSF0_whPQ3pKRixCcii0IdIn63u-SrvKPPoQ5ao';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
