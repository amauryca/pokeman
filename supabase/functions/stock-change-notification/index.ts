import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { changes, type } = await req.json();

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return new Response(JSON.stringify({ error: "No changes provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const isUpload = type === "bulk_upload";
    const subject = isUpload
      ? `📦 ${changes.length} New Products Added to PokéMarket`
      : `📊 Stock Update — PokéMarket Inventory Change`;

    const rows = changes
      .map(
        (c: { name: string; price: number; quantity: number; status: string }) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${c.name}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">$${Number(c.price).toFixed(2)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${c.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">
              <span style="color:${c.status === "sold" || c.quantity <= 0 ? "#dc2626" : c.quantity <= 3 ? "#f59e0b" : "#16a34a"};">
                ${c.status === "sold" || c.quantity <= 0 ? "Sold Out" : c.quantity <= 3 ? "Low Stock" : "In Stock"}
              </span>
            </td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#dc2626;">PokéMarket Inventory ${isUpload ? "Upload" : "Update"}</h2>
        <p>${isUpload ? `${changes.length} new product(s) were added via Excel upload.` : "The following products had stock changes:"}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f8f8f8;">
              <th style="padding:8px;text-align:left;">Product</th>
              <th style="padding:8px;text-align:left;">Price</th>
              <th style="padding:8px;text-align:left;">Qty</th>
              <th style="padding:8px;text-align:left;">Status</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr style="border:none;border-top:1px solid #eee;"/>
        <p style="color:#888;font-size:12px;"><em>Sent automatically from PokéMarket</em></p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PokéMarket <onboarding@resend.dev>",
        to: ["amaurycacevedo@gmail.com"],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to send notification" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
