import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    throw new Error(data.message || "Failed to send email");
  }
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const MAILEROO_API_KEY = Deno.env.get("MAILEROO_API_KEY");
    if (!MAILEROO_API_KEY) {
      throw new Error("MAILEROO_API_KEY is not configured");
    }

    // 1. Notify admin about new subscriber
    await sendEmail(
      MAILEROO_API_KEY,
      "amaury2007@icloud.com",
      `New Newsletter Subscriber: ${email}`,
      `
        <h2>New Newsletter Subscriber! 🎉</h2>
        <p>Someone just signed up for your PokéMarket newsletter.</p>
        <p><strong>Email:</strong> ${email}</p>
        <hr/>
        <p><em>Sent automatically from PokéMarket</em></p>
      `
    );

    // 2. Send welcome email to the subscriber
    await sendEmail(
      MAILEROO_API_KEY,
      email,
      "Welcome to PokéMarket! 🎉",
      `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#dc2626;">Welcome to PokéMarket! 🎉</h2>
          <p>Thanks for subscribing! You'll be the first to know when new Pokémon cards, booster boxes, and ETBs drop.</p>
          <p>Stay tuned — we'll only email you when there's something worth seeing. No spam, just Pokémon.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;"/>
          <p style="color:#888;font-size:12px;"><em>PokéMarket — Your Pokémon Collection Starts Here</em></p>
        </div>
      `
    );

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
