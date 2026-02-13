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
    const { customer_name, email, phone, products, notes } = await req.json();

    const productList = products
      .map((p: { name: string; quantity: number }) => `• ${p.name} (x${p.quantity})`)
      .join("\n");

    const emailBody = `
New Order Request from PokéMarket!

Customer: ${customer_name}
Email: ${email}
Phone: ${phone || "Not provided"}

Products Requested:
${productList}

Notes: ${notes || "None"}

---
Sent automatically from PokéMarket
    `.trim();

    // Use Supabase's built-in email or a simple SMTP approach
    // For now, log the order (email sending requires SMTP setup)
    console.log("Order email would be sent to amaurycacevedo@gmail.com");
    console.log(emailBody);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process order" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
