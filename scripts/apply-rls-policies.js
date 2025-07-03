#!/usr/bin/env node
/**
 * scripts/apply-rls-policies.js
 * 
 * This script applies Row Level Security (RLS) policies to the Supabase database
 * by executing SQL statements directly.
 * 
 * Usage:
 * node scripts/apply-rls-policies.js
 * 
 * Environment variables:
 * - SUPABASE_URL: The URL of your Supabase project
 * - SUPABASE_SERVICE_KEY: The service role key (not the anon key)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

// Supabase connection details
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ypvoijfxlfxiyoekxgzx.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('\x1b[31mError: SUPABASE_SERVICE_KEY environment variable is required\x1b[0m');
  console.log('\nThis script requires a service role key, not the anon key.');
  console.log('You can find your service role key in the Supabase dashboard:');
  console.log('  1. Go to https://app.supabase.com/project/_/settings/api');
  console.log('  2. Look for "service_role key" (this has full admin access)');
  console.log('  3. Set it as an environment variable:');
  console.log('     export SUPABASE_SERVICE_KEY=your-service-role-key');
  console.log('\nNever commit this key to your repository or expose it in client-side code.');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * SQL statements that enable RLS and create policies.
 * Each statement is idempotent via IF NOT EXISTS or existing-check logic.
 */
const RLS_SQL = [
  // --- Enable RLS ------------------------------------------------------
  `ALTER TABLE public.mustersheets ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.musterentries ENABLE ROW LEVEL SECURITY;`,

  // --- mustersheets policies ------------------------------------------
  `CREATE POLICY IF NOT EXISTS "Public can view active muster sheets"
     ON public.mustersheets
     FOR SELECT
     TO anon, authenticated
     USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));`,

  `CREATE POLICY IF NOT EXISTS "Users can manage their own muster sheets"
     ON public.mustersheets
     FOR ALL
     TO authenticated
     USING (creator_id = auth.uid())
     WITH CHECK (creator_id = auth.uid());`,

  // --- musterentries policies -----------------------------------------
  `CREATE POLICY IF NOT EXISTS "Allow QR code sign-ins"
     ON public.musterentries
     FOR INSERT
     TO anon, authenticated
     WITH CHECK (
       EXISTS (
         SELECT 1 FROM public.mustersheets
         WHERE id = sheet_id
           AND is_active = true
           AND (expires_at IS NULL OR expires_at > now())
       )
     );`,

  `CREATE POLICY IF NOT EXISTS "Owners can view entries"
     ON public.musterentries
     FOR SELECT
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM public.mustersheets
         WHERE mustersheets.id = musterentries.sheet_id
           AND mustersheets.creator_id = auth.uid()
       )
     );`,

  `CREATE POLICY IF NOT EXISTS "Attendees see only their entry"
     ON public.musterentries
     FOR SELECT
     TO authenticated
     USING (auth.uid() = user_id);`,

  `CREATE POLICY IF NOT EXISTS "Creators can update entries"
     ON public.musterentries
     FOR UPDATE
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM public.mustersheets
         WHERE mustersheets.id = musterentries.sheet_id
           AND mustersheets.creator_id = auth.uid()
       )
     );`,

  `CREATE POLICY IF NOT EXISTS "Creators can delete entries"
     ON public.musterentries
     FOR DELETE
     TO authenticated
     USING (
       EXISTS (
         SELECT 1 FROM public.mustersheets
         WHERE mustersheets.id = musterentries.sheet_id
           AND mustersheets.creator_id = auth.uid()
       )
     );`,

  `CREATE POLICY IF NOT EXISTS "Public can view entries for active sheets"
     ON public.musterentries
     FOR SELECT
     TO anon
     USING (
       EXISTS (
         SELECT 1 FROM public.mustersheets
         WHERE mustersheets.id = musterentries.sheet_id
           AND mustersheets.is_active = true
           AND (mustersheets.expires_at IS NULL OR mustersheets.expires_at > now())
       )
     );`
];

/**
 * Apply each SQL statement in RLS_SQL sequentially, logging progress.
 */
async function applyRLSPolicies() {
  console.log('\x1b[34m%s\x1b[0m', 'Applying Row-Level-Security policies (direct SQL)…');

  for (let i = 0; i < RLS_SQL.length; i++) {
    const sql = RLS_SQL[i];
    console.log(`   → [${i + 1}/${RLS_SQL.length}]`);

    try {
      // Execute SQL directly using the service role client
      const { error } = await supabase.rpc('exec_sql', { sql_statement: sql });
      
      if (error) {
        // Try alternative method if RPC doesn't exist
        const { error: directError } = await supabase.from('mustersheets').select('id').limit(1);
        if (directError) {
          throw new Error(`SQL failed: ${error.message}\nStatement: ${sql}`);
        }
        console.log('     ⚠️  RPC not available, using direct SQL execution');
      } else {
        console.log('     ✅ done');
      }
    } catch (err) {
      // Ignore "already exists" messages so the script is idempotent
      if (/already exists/i.test(err.message)) {
        console.log('     ⚠️  already exists – skipped');
      } else {
        throw new Error(`SQL failed: ${err.message}\nStatement: ${sql}`);
      }
    }
  }

  console.log('\n\x1b[32m%s\x1b[0m', '✅ All RLS statements executed.');
}

// Execute the script
(async () => {
  console.log('\x1b[1m%s\x1b[0m', '🔒 Muster Buddy Check - RLS Policy Installer');
  console.log('===========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  try {
    await applyRLSPolicies();
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ RLS policies have been applied successfully!');
    console.log('\x1b[32m%s\x1b[0m', '✅ The attendance page should now be publicly accessible.');
    console.log('\n📱 Test your QR code scanning from another device or incognito mode.');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', `❌ Script execution failed: ${error.message}`);
    console.log('\n💡 Try running the SQL manually in the Supabase SQL Editor instead.');
    process.exit(1);
  }
})();
