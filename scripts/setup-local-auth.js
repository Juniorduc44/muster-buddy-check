import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Define the localhost redirect URLs that we want to ensure are present
const LOCAL_REDIRECT_URLS = [
  "http://localhost:3000/*",
  "http://localhost:3000/auth/v1/callback"
];

async function setupLocalAuth() {
  console.log('\x1b[1m\x1b[34m🔧 Setting up Supabase for local development...\x1b[0m');

  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('\x1b[31m❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required.\x1b[0m');
    console.log('Please ensure your .env file contains these values.');
    process.exit(1);
  }

  // Extract project_ref from SUPABASE_URL
  const projectRefMatch = SUPABASE_URL.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.co/);
  if (!projectRefMatch || !projectRefMatch[1]) {
    console.error('\x1b[31m❌ Error: Could not extract project reference from SUPABASE_URL.\x1b[0m');
    console.log('Make sure your SUPABASE_URL is in the format: https://<project-ref>.supabase.co');
    process.exit(1);
  }
  const projectRef = projectRefMatch[1];

  const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/auth/settings`;

  try {
    // 1. Fetch current auth settings
    console.log('\x1b[36m📡 Fetching current Supabase auth settings...\x1b[0m');
    const response = await fetch(managementApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch auth settings: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const currentSettings = await response.json();
    let updatedRedirectURLs = currentSettings.redirect_urls || [];
    let changesMade = false;

    // 2. Check if redirect URLs already exist and add them if not
    console.log('\x1b[36m🔍 Checking for existing localhost redirect URLs...\x1b[0m');
    for (const url of LOCAL_REDIRECT_URLS) {
      if (!updatedRedirectURLs.includes(url)) {
        updatedRedirectURLs.push(url);
        changesMade = true;
        console.log(`\x1b[32m✅ Added new redirect URL:\x1b[0m ${url}`);
      } else {
        console.log(`\x1b[33m⚠️ Redirect URL already exists:\x1b[0m ${url}`);
      }
    }

    if (!changesMade) {
      console.log('\x1b[33m🎉 No new localhost redirect URLs to add. Settings are up to date.\x1b[0m');
      return;
    }

    // 3. Send PATCH request to update the settings
    console.log('\x1b[36m📤 Updating Supabase auth settings with new redirect URLs...\x1b[0m');
    const patchResponse = await fetch(managementApiUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ redirect_urls: updatedRedirectURLs }),
    });

    if (!patchResponse.ok) {
      const errorData = await patchResponse.json().catch(() => ({}));
      throw new Error(`Failed to update auth settings: ${patchResponse.status} ${patchResponse.statusText} - ${JSON.stringify(errorData)}`);
    }

    console.log('\x1b[32m\x1b[1m✅ Supabase auth settings updated successfully for local development!\x1b[0m');
    console.log('\x1b[32m💡 Remember to also add these URLs to your OAuth provider dashboards (Google, GitHub, etc.).\x1b[0m');
    console.log('\x1b[32m🚀 You can now test your application locally at http://localhost:3000.\x1b[0m');

  } catch (error) {
    console.error('\x1b[31m\x1b[1m❌ An error occurred during setup:\x1b[0m', error.message);
    
    if (error.message.includes('401')) {
      console.error('\x1b[31m❗ Authentication failed. Make sure your SUPABASE_SERVICE_KEY is correct.\x1b[0m');
      console.error('\x1b[31m❗ Note: You must use the service role key, not the anon/public key.\x1b[0m');
    } else if (error.message.includes('403')) {
      console.error('\x1b[31m❗ Permission denied. Your service key might not have the necessary permissions.\x1b[0m');
    } else if (error.message.includes('404')) {
      console.error('\x1b[31m❗ Project not found. Check if your project reference is correct.\x1b[0m');
    }
    
    console.error('\x1b[31m❗ Please check your SUPABASE_URL, SUPABASE_SERVICE_KEY, and network connection.\x1b[0m');
    process.exit(1);
  }
}

// Execute the setup function
setupLocalAuth();
