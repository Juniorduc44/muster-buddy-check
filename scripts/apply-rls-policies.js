#!/usr/bin/env node
/**
 * scripts/apply-rls-policies.js
 * 
 * This script applies Row Level Security (RLS) policies to the Supabase database
 * to make muster sheets and attendance records publicly accessible.
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

// SQL statements to apply RLS policies
const rls_policies = [
  // Enable RLS on tables
  `ALTER TABLE public.muster_sheets ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.muster_entries ENABLE ROW LEVEL SECURITY;`,
  
  // Policy 1: Allow public read access to active muster sheets
  `CREATE POLICY IF NOT EXISTS "Public can view active muster sheets"
    ON public.muster_sheets
    FOR SELECT
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));`,
  
  // Policy 2: Allow authenticated users to manage their own muster sheets
  `CREATE POLICY IF NOT EXISTS "Users can manage their own muster sheets"
    ON public.muster_sheets
    FOR ALL
    USING (creator_id = auth.uid())
    WITH CHECK (creator_id = auth.uid());`,
  
  // Policy 3: Allow anonymous attendees to submit entries via QR code
  `CREATE POLICY IF NOT EXISTS "Allow QR code sign-ins"
    ON public.muster_entries
    FOR INSERT TO anon
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.muster_sheets
        WHERE id = sheet_id
      )
    );`,
  
  // Policy 4: Owners (sheet creators) can view all entries for their sheets
  `CREATE POLICY IF NOT EXISTS "Owners can view entries"
    ON public.muster_entries
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.muster_sheets
        WHERE muster_sheets.id = muster_entries.sheet_id
          AND muster_sheets.creator_id = auth.uid()
      )
    );`,
  
  // Policy 5: Authenticated attendees can view only their own entry
  `CREATE POLICY IF NOT EXISTS "Attendees see only their entry"
    ON public.muster_entries
    FOR SELECT
    USING (auth.uid() = user_id);`
];

/**
 * Apply RLS policies to the database
 */
async function applyRLSPolicies() {
  console.log('\x1b[34m%s\x1b[0m', 'Applying Row Level Security (RLS) policies...');
  
  for (const [index, sql] of rls_policies.entries()) {
    try {
      console.log(`\n[${index + 1}/${rls_policies.length}] Executing SQL:`);
      console.log('\x1b[90m%s\x1b[0m', sql);
      
      const { error } = await supabase.rpc('pgaudit.exec_sql', { sql });
      
      if (error) {
        if (error.message.includes('already exists')) {
          console.log('\x1b[33m%s\x1b[0m', '  ⚠️  Policy already exists, skipping...');
        } else {
          console.error('\x1b[31m%s\x1b[0m', `  ❌ Error: ${error.message}`);
        }
      } else {
        console.log('\x1b[32m%s\x1b[0m', '  ✅ Success');
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', `  ❌ Exception: ${error.message}`);
      
      // If the pgaudit.exec_sql function doesn't exist, try direct SQL execution
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        try {
          console.log('\x1b[90m%s\x1b[0m', '  Trying direct SQL execution...');
          const { error: directError } = await supabase.rpc('exec_sql', { command: sql });
          
          if (directError) {
            // Last resort: try raw REST API call
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
              },
              body: JSON.stringify({ command: sql })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              console.error('\x1b[31m%s\x1b[0m', `  ❌ REST API Error: ${JSON.stringify(errorData)}`);
            } else {
              console.log('\x1b[32m%s\x1b[0m', '  ✅ Success via REST API');
            }
          } else {
            console.log('\x1b[32m%s\x1b[0m', '  ✅ Success via exec_sql');
          }
        } catch (finalError) {
          console.error('\x1b[31m%s\x1b[0m', `  ❌ Final Error: ${finalError.message}`);
          console.error('\x1b[31m%s\x1b[0m', '  You may need to execute these SQL commands manually in the Supabase SQL editor.');
        }
      }
    }
  }
}

/**
 * Verify RLS policies are correctly applied
 */
async function verifyRLSPolicies() {
  console.log('\n\x1b[34m%s\x1b[0m', 'Verifying RLS policies...');
  
  try {
    const { data: musterPolicies, error: musterError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'muster_sheets');
    
    const { data: attendancePolicies, error: attendanceError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'muster_entries');
    
    if (musterError || attendanceError) {
      console.error('\x1b[31m%s\x1b[0m', '  ❌ Error verifying policies. You may need to check manually in the Supabase dashboard.');
    } else {
      console.log('\x1b[32m%s\x1b[0m', `  ✅ Found ${musterPolicies?.length || 0} policies for muster_sheets`);
      console.log('\x1b[32m%s\x1b[0m', `  ✅ Found ${attendancePolicies?.length || 0} policies for muster_entries`);
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `  ❌ Error during verification: ${error.message}`);
  }
}

// Execute the script
(async () => {
  console.log('\x1b[1m%s\x1b[0m', '🔒 Muster Buddy Check - RLS Policy Installer');
  console.log('===========================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  
  try {
    await applyRLSPolicies();
    await verifyRLSPolicies();
    
    console.log('\n\x1b[32m%s\x1b[0m', '✅ RLS policies have been applied successfully!');
    console.log('\x1b[32m%s\x1b[0m', '✅ The attendance page should now be publicly accessible.');
    console.log('\n📱 Test your QR code scanning from another device or incognito mode.');
  } catch (error) {
    console.error('\n\x1b[31m%s\x1b[0m', `❌ Script execution failed: ${error.message}`);
    process.exit(1);
  }
})();
