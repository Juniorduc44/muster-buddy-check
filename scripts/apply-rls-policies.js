#!/usr/bin/env node
/**
 * scripts/apply-rls-policies.js
 * 
 * This script applies Row Level Security (RLS) policies to the Supabase database
 * by calling a PostgreSQL function `apply_rls_policies()`.
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
 * Apply RLS policies to the database by calling the PostgreSQL function.
 */
async function applyRLSPolicies() {
  console.log('\x1b[34m%s\x1b[0m', 'Calling apply_rls_policies() function...');
  
  const { data, error } = await supabase.rpc('apply_rls_policies');

  if (error) {
    throw new Error(`apply_rls_policies failed: ${error.message}`);
  }
  
  console.log('\x1b[32m%s\x1b[0m', '✅ RLS function executed successfully');
  console.log('\x1b[32m%s\x1b[0m', `Status: ${data.status}, Policies Applied: ${data.policies_applied}`);
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
    process.exit(1);
  }
})();
