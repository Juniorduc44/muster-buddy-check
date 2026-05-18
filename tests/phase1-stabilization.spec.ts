import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.PHASE1_BASE_URL ?? 'http://127.0.0.1:4173';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for Phase 1 smoke tests');
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const runId = `${Date.now()}`;
const ownerEmail = `phase1-owner-${runId}@example.com`;
const outsiderEmail = `phase1-outsider-${runId}@example.com`;
const ownerPassword = `Phase1!${runId}`;
const outsiderPassword = `Phase1!${runId}x`;
const signUpEmail = `phase1-signup-${runId}@example.com`;
const signUpPassword = `Phase1!${runId}y`;
const sheetTitle = `Phase 1 Smoke ${runId}`;

let ownerId = '';
let outsiderId = '';
let activeSheetId = '';
let inactiveSheetId = '';
let expiredSheetId = '';
let attendanceHash = '';

async function createConfirmedUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create user ${email}: ${error?.message ?? 'unknown error'}`);
  }

  return data.user.id;
}

async function createSheet(
  creatorId: string,
  overrides: Partial<{
    title: string;
    description: string;
    is_active: boolean;
    expires_at: string | null;
    required_fields: string[];
    time_format: 'standard' | 'military';
  }> = {},
) {
  const { data, error } = await admin
    .from('mustersheets')
    .insert({
      creator_id: creatorId,
      title: overrides.title ?? `Sheet ${Date.now()}`,
      description: overrides.description ?? 'Phase 1 stability test sheet',
      required_fields: overrides.required_fields ?? ['first_name', 'last_name', 'email', 'phone'],
      time_format: overrides.time_format ?? 'standard',
      is_active: overrides.is_active ?? true,
      expires_at: overrides.expires_at ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create sheet: ${error?.message ?? 'unknown error'}`);
  }

  return data.id;
}

async function deleteSheetsForUser(userId: string) {
  const { data: sheets, error } = await admin
    .from('mustersheets')
    .select('id')
    .eq('creator_id', userId);

  if (error) {
    throw new Error(`Failed to list sheets for cleanup: ${error.message}`);
  }

  for (const sheet of sheets ?? []) {
    await admin.from('musterentries').delete().eq('sheet_id', sheet.id);
  }

  await admin.from('mustersheets').delete().eq('creator_id', userId);
}

async function cleanupUser(userId: string) {
  if (!userId) return;
  await deleteSheetsForUser(userId);
  await admin.auth.admin.deleteUser(userId);
}

async function dismissOnboarding(page: import('@playwright/test').Page) {
  const closeButton = page.locator('button').filter({ has: page.locator('svg') }).first();
  const modalTitle = page.getByText('MusterSheets Onboarding');

  if (await modalTitle.isVisible().catch(() => false)) {
    await closeButton.click();
  } else if (await page.getByText('Get Started').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Get Started' }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByRole('button', { name: /let's go!/i }).click();
  }
}

async function signIn(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await dismissOnboarding(page);
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await expect(page.getByText('Your Attendance Sheets')).toBeVisible();
}

test.describe.serial('Phase 1 stabilization smoke', () => {
  test.beforeAll(async () => {
    ownerId = await createConfirmedUser(ownerEmail, ownerPassword);
    outsiderId = await createConfirmedUser(outsiderEmail, outsiderPassword);
    inactiveSheetId = await createSheet(ownerId, {
      title: `${sheetTitle} Inactive`,
      is_active: false,
    });
    expiredSheetId = await createSheet(ownerId, {
      title: `${sheetTitle} Expired`,
      expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
  });

  test.afterAll(async () => {
    await cleanupUser(ownerId);
    await cleanupUser(outsiderId);
  });

  test('auth flows and root route remain stable', async ({ page, context }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await dismissOnboarding(page);
    await expect(page.getByText('Sign In')).toBeVisible();

    await page.getByRole('button', { name: /don't have an account\? sign up/i }).click();
    await page.getByPlaceholder('Email').fill(signUpEmail);
    await page.getByPlaceholder('Password').fill(signUpPassword);
    await page.getByRole('button', { name: /^create account$/i }).click();

    await expect
      .poll(async () => {
        const content = await page.textContent('body');
        return content ?? '';
      })
      .toMatch(/sign in|create account|your attendance sheets|magic link sent|check your email/i);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await dismissOnboarding(page);
    await page.getByRole('button', { name: /use magic link/i }).click();
    await page.getByPlaceholder('Email').fill(ownerEmail);
    await page.getByRole('button', { name: /send magic link/i }).click();
    await expect(page.getByText('Magic link sent! Check your email to sign in.')).toBeVisible();

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await dismissOnboarding(page);
    await Promise.all([
      page.waitForURL(/auth\/v1\/authorize|accounts\.google\.com/i),
      page.getByRole('button', { name: /continue with google/i }).click(),
    ]);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await dismissOnboarding(page);
    await Promise.all([
      page.waitForURL(/auth\/v1\/authorize|github\.com/i),
      page.getByRole('button', { name: /continue with github/i }).click(),
    ]);

    await signIn(page, ownerEmail, ownerPassword);
    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page.getByText('Sign In')).toBeVisible();

    const guestMode = await page.evaluate(() => window.localStorage.getItem('guest_mode'));
    expect(guestMode).toBeNull();
    await context.clearCookies();
  });

  test('organizer-to-attendee flow remains stable', async ({ browser, page }) => {
    await signIn(page, ownerEmail, ownerPassword);

    await page.getByRole('button', { name: /create new sheet/i }).click();
    await page.getByText('Class Attendance').click();
    await page.getByLabel('Event Title').fill(sheetTitle);
    await page.getByRole('button', { name: /^create sheet$/i }).click();
    await expect(page.getByText(sheetTitle)).toBeVisible();

    const activeSheet = await admin
      .from('mustersheets')
      .select('id')
      .eq('creator_id', ownerId)
      .eq('title', sheetTitle)
      .single();

    if (activeSheet.error || !activeSheet.data) {
      throw new Error(`Failed to fetch created sheet: ${activeSheet.error?.message ?? 'missing row'}`);
    }

    activeSheetId = activeSheet.data.id;

    await page.goto(`${BASE_URL}/edit/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Edit Muster Sheet')).toBeVisible();

    const outsiderPage = await browser.newPage();
    await signIn(outsiderPage, outsiderEmail, outsiderPassword);
    await outsiderPage.goto(`${BASE_URL}/edit/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(outsiderPage.getByText('Access Denied')).toBeVisible();
    await outsiderPage.goto(`${BASE_URL}/results/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(outsiderPage.getByText('Access Denied')).toBeVisible();
    await outsiderPage.close();

    const publicPage = await browser.newPage();
    await publicPage.goto(`${BASE_URL}/attend/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(publicPage.getByText(sheetTitle)).toBeVisible();
    await publicPage.getByLabel('First Name *').fill('Phase');
    await publicPage.getByLabel('Last Name *').fill('Tester');
    await publicPage.getByLabel('Email').fill('attendee@example.com');
    await publicPage.getByLabel('Phone').fill('555-0100');
    await publicPage.getByLabel('Badge Number').fill('S-100');
    await publicPage.getByRole('button', { name: /record my attendance/i }).click();
    await expect(publicPage.getByText('Attendance Recorded!')).toBeVisible();
    await expect(publicPage.getByText('Proof of Attendance Receipt')).toBeVisible();

    const receiptText = await publicPage.locator('p.text-sm.font-mono.text-green-400').textContent();
    if (!receiptText) {
      throw new Error('Attendance receipt was not rendered');
    }
    attendanceHash = receiptText.replace(/\s+/g, '');

    await page.goto(`${BASE_URL}/results/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Attendance Records')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Phase Tester' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /phone/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /badge number/i })).toBeVisible();

    await page.getByRole('button', { name: /show attendance hashes/i }).click();
    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /export csv/i }).click(),
    ]);
    const csvPath = await download[0].path();
    if (!csvPath) {
      throw new Error('CSV export did not produce a file');
    }

    const csvContent = await (await import('node:fs/promises')).readFile(csvPath, 'utf8');
    expect(csvContent).toContain('Name,Email,Phone,Badge Number,Check-in Time,Receipt Code');
    expect(csvContent).toContain('Phase Tester');
    expect(csvContent).toContain('attendee@example.com');

    await page.goto(`${BASE_URL}/verify`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Enter receipt code...').fill(attendanceHash);
    await page.getByRole('button', { name: /verify receipt/i }).click();
    await expect(page.getByText('Valid Receipt')).toBeVisible();

    await page.goto(`${BASE_URL}/attend/${inactiveSheetId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Event Inactive')).toBeVisible();

    await page.goto(`${BASE_URL}/attend/${expiredSheetId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText('Event Expired')).toBeVisible();

    await page.goto(`${BASE_URL}/attend/00000000-0000-0000-0000-000000000000`, { waitUntil: 'networkidle' });
    await expect(page.getByText(/sheet not found|access restricted/i)).toBeVisible();

    await page.goto(`${BASE_URL}/qr/${activeSheetId}`, { waitUntil: 'networkidle' });
    await expect(page.getByText(`QR Code for ${sheetTitle}`)).toBeVisible();
    await expect(page.locator('img[alt="QR Code for attendance"]')).toBeVisible();
  });
});
