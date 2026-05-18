import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AttendanceRequest = {
  sheetId: string;
  formData: Record<string, string>;
};

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
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

    const { sheetId, formData }: AttendanceRequest = await req.json();

    if (!sheetId || !formData?.first_name || !formData?.last_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: sheetId, first_name, last_name",
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

    const { data: sheet, error: sheetError } = await supabase
      .from("mustersheets")
      .select("id, title, is_active, expires_at")
      .eq("id", sheetId)
      .maybeSingle();

    if (sheetError || !sheet) {
      return new Response(
        JSON.stringify({ success: false, error: "Sheet not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const isExpired = sheet.expires_at && new Date(sheet.expires_at) < new Date();
    if (!sheet.is_active || isExpired) {
      return new Response(
        JSON.stringify({
          success: false,
          error: isExpired ? "This attendance sheet has expired." : "This attendance sheet is inactive.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const timestamp = new Date().toISOString();
    const recordData = {
      sheet_id: sheetId,
      timestamp,
      first_name: formData.first_name || "",
      last_name: formData.last_name || "",
      email: formData.email || null,
      phone: formData.phone || null,
      rank: formData.rank || null,
      badge_number: formData.badge_number || null,
      unit: formData.unit || null,
      age: formData.age ? parseInt(formData.age, 10) : null,
    };

    const { data: insertedRows, error: insertError } = await supabase
      .from("musterentries")
      .insert([recordData])
      .select("id, sheet_id, first_name, last_name, created_at, timestamp, email, phone, rank, badge_number, unit, age")
      .single();

    if (insertError || !insertedRows) {
      return new Response(
        JSON.stringify({
          success: false,
          error: insertError?.message || "Failed to submit attendance",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const attendanceHash = await sha256Hex(
      buildLegacyPayload({
        id: insertedRows.id,
        sheetId: insertedRows.sheet_id,
        firstName: insertedRows.first_name,
        lastName: insertedRows.last_name,
        timestamp: insertedRows.timestamp,
        createdAt: insertedRows.created_at,
        email: insertedRows.email,
        phone: insertedRows.phone,
        rank: insertedRows.rank,
        badgeNumber: insertedRows.badge_number,
        unit: insertedRows.unit,
        age: insertedRows.age,
      }),
    );

    const { error: hashUpdateError } = await supabase
      .from("musterentries")
      .update({ attendance_hash: attendanceHash })
      .eq("id", insertedRows.id);

    if (hashUpdateError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: hashUpdateError.message || "Attendance submitted, but receipt generation failed",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        entryId: insertedRows.id,
        attendanceHash,
        sheetTitle: sheet.title,
        timestamp: insertedRows.timestamp,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Submit attendance error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected submission error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
