import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify({
      from: { address: "noreply@a1b60fff033b8428.maileroo.org", display_name: "PokéMarket" },
      to: [{ address: to }],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error(`Maileroo error sending to ${to}:`, data);
  }
  return { ok: res.ok, data };
}

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

    const MAILEROO_API_KEY = Deno.env.get("MAILEROO_API_KEY");
    if (!MAILEROO_API_KEY) {
      throw new Error("MAILEROO_API_KEY is not configured");
    }

    const isUpload = type === "bulk_upload";
    // Filter out "coming soon" items — only notify for available products
    const availableChanges = changes.filter((c: { status?: string }) => c.status !== "occur");
    if (availableChanges.length === 0) {
      return new Response(JSON.stringify({ success: true, skipped: "all items coming soon" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isNewProduct = type === "new_product";
    const isPriceUpdate = type === "price_update";
    const subject = isUpload
      ? `📦 ${availableChanges.length} New Products Added to PokéMarket`
      : isNewProduct
      ? `🆕 New Product Added — ${escapeHtml(availableChanges[0]?.name || "PokéMarket")}`
      : isPriceUpdate
      ? `💰 Price Update — ${escapeHtml(availableChanges[0]?.name || "PokéMarket")}`
      : `📊 Stock Update — PokéMarket Inventory Change`;

    const rows = availableChanges
      .map(
        (c: { name: string; price: number; quantity: number; status: string; oldPrice?: number }) => {
          const priceChanged = c.oldPrice != null && c.oldPrice !== c.price;
          const priceDisplay = priceChanged
            ? `<span style="text-decoration:line-through;color:#999;">$${Number(c.oldPrice).toFixed(2)}</span> → <strong>$${Number(c.price).toFixed(2)}</strong>`
            : `$${Number(c.price).toFixed(2)}`;
          return `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee;">${escapeHtml(c.name)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${priceDisplay}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${c.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">
              <span style="color:${c.status === "sold" || c.quantity <= 0 ? "#dc2626" : c.quantity <= 3 ? "#f59e0b" : "#16a34a"};">
                ${c.status === "sold" || c.quantity <= 0 ? "Sold Out" : c.quantity <= 3 ? "Low Stock" : "In Stock"}
              </span>
            </td>
          </tr>`;
        }
      )
      .join("");

    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#dc2626;">PokéMarket Inventory ${isPriceUpdate ? "Price Update" : isNewProduct ? "New Product" : isUpload ? "Upload" : "Update"}</h2>
        <p>${isPriceUpdate ? "The following products had price changes:" : isNewProduct ? "A new product was just added:" : isUpload ? `${availableChanges.length} new product(s) were added via Excel upload.` : "The following products had stock changes:"}</p>
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

    // Skip admin email — only notify subscribers

    // Notify newsletter subscribers for new products, uploads, and price updates
    if (isNewProduct || isUpload || isPriceUpdate) {
      // Use service role to read subscribers
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: subscribers } = await serviceSupabase
        .from("newsletter_subscribers")
        .select("email")
        .eq("is_active", true);

      if (subscribers && subscribers.length > 0) {
        let subscriberSubject: string;
        let subscriberHtml: string;

        if (isPriceUpdate) {
          const productList = availableChanges
            .map(
              (c: { name: string; price: number; oldPrice?: number }) => {
                const priceStr = c.oldPrice != null && c.oldPrice !== c.price
                  ? `<span style="text-decoration:line-through;color:#999;">$${Number(c.oldPrice).toFixed(2)}</span> → <strong>$${Number(c.price).toFixed(2)}</strong>`
                  : `$${Number(c.price).toFixed(2)}`;
                return `<li style="margin-bottom:8px;"><strong>${escapeHtml(c.name)}</strong> — ${priceStr}</li>`;
              }
            )
            .join("");

          subscriberSubject = availableChanges.length === 1
            ? `💰 Price Update: ${escapeHtml(availableChanges[0]?.name || "PokéMarket")}`
            : `💰 Price Updates on PokéMarket`;

          subscriberHtml = `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#dc2626;">Price Update! 💰</h2>
              <p>Heads up — prices just changed on these items:</p>
              <ul style="padding-left:20px;">${productList}</ul>
              <p style="margin-top:16px;">
                <a href="https://pokeman.lovable.app/products" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Shop Now →
                </a>
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
              <p style="color:#888;font-size:12px;"><em>You're receiving this because you subscribed to PokéMarket updates.</em></p>
            </div>
          `;
        } else {
          subscriberSubject = isUpload
            ? `🆕 ${availableChanges.length} New Products Just Dropped on PokéMarket!`
            : `🆕 New Drop: ${escapeHtml(availableChanges[0]?.name || "Check it out!")}`;

          const productList = availableChanges
            .map(
              (c: { name: string; price: number }) =>
                `<li style="margin-bottom:8px;"><strong>${escapeHtml(c.name)}</strong> — $${Number(c.price).toFixed(2)}</li>`
            )
            .join("");

          subscriberHtml = `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#dc2626;">New Drop Alert! 🔥</h2>
              <p>Hey! New Pokémon products just landed on PokéMarket:</p>
              <ul style="padding-left:20px;">${productList}</ul>
              <p style="margin-top:16px;">
                <a href="https://pokeman.lovable.app/products" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">
                  Shop Now →
                </a>
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
              <p style="color:#888;font-size:12px;"><em>You're receiving this because you subscribed to PokéMarket updates.</em></p>
            </div>
          `;
        }

        // Send to each subscriber (fire-and-forget, don't block on failures)
        const emailPromises = subscribers.map((sub) =>
          sendEmail(MAILEROO_API_KEY, sub.email, subscriberSubject, subscriberHtml)
            .catch((err) => console.error(`Failed to email ${sub.email}:`, err))
        );

        await Promise.allSettled(emailPromises);
        console.log(`Sent new product notification to ${subscribers.length} subscriber(s)`);
      }
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
