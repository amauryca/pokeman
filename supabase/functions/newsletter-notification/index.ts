import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { email } = await req.json();

    const MAILEROO_API_KEY = Deno.env.get("MAILEROO_API_KEY");
    if (!MAILEROO_API_KEY) {
      throw new Error("MAILEROO_API_KEY is not configured");
    }

    const res = await fetch("https://smtp.maileroo.com/api/v2/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": MAILEROO_API_KEY,
      },
      body: JSON.stringify({
        from: { address: "noreply@a1b60fff033b8428.maileroo.org", display_name: "PokéMarket" },
        to: [{ address: "amaury2007@icloud.com" }],
        subject: `New Newsletter Subscriber: ${email}`,
        html: `
          <h2>New Newsletter Subscriber! 🎉</h2>
          <p>Someone just signed up for your PokéMarket newsletter.</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr/>
          <p><em>Sent automatically from PokéMarket</em></p>
        `,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Maileroo error:", data);
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
