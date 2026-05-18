import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type VerifyResult = {
  isValid: boolean;
  sheetTitle?: string;
  checkedInAt?: string;
  attendeeNameMasked?: string;
  error?: string;
};

function isValidHashFormat(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

function maskName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length === 1) return `${trimmed}***`;
  return `${trimmed[0]}***`;
}

function buildLegacyPayload(entryData: {
  id: string;
  sheetId: string;
  firstName: string;
  lastName: string;
  timestamp: string;
  createdAt: string;
  email?: string | null;
  phone?: string | null;
  rank?: string | null;
  badgeNumber?: string | null;
  unit?: string | null;
  age?: number | null;
}) {
  return JSON.stringify({
    id: entryData.id,
    sheetId: entryData.sheetId,
    firstName: entryData.firstName.toLowerCase().trim(),
    lastName: entryData.lastName.toLowerCase().trim(),
    timestamp: entryData.timestamp,
    createdAt: entryData.createdAt,
    email: entryData.email?.toLowerCase().trim() || "",
    phone: entryData.phone?.trim() || "",
    rank: entryData.rank?.trim() || "",
    badgeNumber: entryData.badgeNumber?.trim() || "",
    unit: entryData.unit?.trim() || "",
    age: entryData.age || 0,
    salt: "muster-sheets-attendance-2024",
  });
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const { receiptHash } = await req.json();
    const cleanHash = typeof receiptHash === "string" ? receiptHash.replace(/\s/g, "") : "";

    if (!isValidHashFormat(cleanHash)) {
      return new Response(
        JSON.stringify<VerifyResult>({
          isValid: false,
          error: "Invalid receipt format",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: entry, error: entryError } = await supabase
      .from("musterentries")
      .select("id, sheet_id, first_name, last_name, timestamp, created_at, email, phone, rank, badge_number, unit, age, attendance_hash")
      .eq("attendance_hash", cleanHash)
      .maybeSingle();

    if (entryError) {
      throw new Error(`Receipt lookup failed: ${entryError.message}`);
    }

    if (!entry) {
      return new Response(
        JSON.stringify<VerifyResult>({
          isValid: false,
          error: "Receipt not found",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: sheet, error: sheetError } = await supabase
      .from("mustersheets")
      .select("title")
      .eq("id", entry.sheet_id)
      .maybeSingle();

    if (sheetError) {
      throw new Error(`Sheet lookup failed: ${sheetError.message}`);
    }

    const expectedHash = await sha256Hex(
      buildLegacyPayload({
        id: entry.id,
        sheetId: entry.sheet_id,
        firstName: entry.first_name,
        lastName: entry.last_name,
        timestamp: entry.timestamp,
        createdAt: entry.created_at,
        email: entry.email,
        phone: entry.phone,
        rank: entry.rank,
        badgeNumber: entry.badge_number,
        unit: entry.unit,
        age: entry.age,
      }),
    );

    const isValid = expectedHash === cleanHash;
    const attendeeNameMasked = `${maskName(entry.first_name)} ${maskName(entry.last_name)}`.trim();

    return new Response(
      JSON.stringify<VerifyResult>({
        isValid,
        sheetTitle: sheet?.title,
        checkedInAt: entry.timestamp,
        attendeeNameMasked,
        error: isValid ? undefined : "Receipt verification failed",
      }),
      {
        status: isValid ? 200 : 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Receipt verification error:", error);

    return new Response(
      JSON.stringify<VerifyResult>({
        isValid: false,
        error: error instanceof Error ? error.message : "An unexpected verification error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
