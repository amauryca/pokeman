import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TCGDEX_API = "https://api.tcgdex.net/v2/en";

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Strategy 1: Search cards by name
async function searchCard(name: string): Promise<string | null> {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (!clean) return null;
  const url = `${TCGDEX_API}/cards?name=${encodeURIComponent(clean)}`;
  console.log(`[card-search] ${url}`);
  const data = await fetchJson(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  // Get full card details for image
  const cardId = data[0].id;
  const card = await fetchJson(`${TCGDEX_API}/cards/${cardId}`);
  return card?.image ? card.image + "/high.webp" : null;
}

// Strategy 2: Partial name (first 1-2 words)
async function searchCardPartial(name: string): Promise<string | null> {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const term = words.slice(0, 2).join(" ");
  if (!term) return null;
  return searchCard(term);
}

// Strategy 3: First word only
async function searchCardFirstWord(name: string): Promise<string | null> {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const first = words[0];
  if (!first || first.length < 3) return null;
  return searchCard(first);
}

// Strategy 4: Search sets by name
async function searchSet(name: string): Promise<string | null> {
  const clean = name
    .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case)\b/gi, "")
    .replace(/[^a-zA-Z0-9 &]/g, "")
    .trim();
  if (!clean) return null;
  const url = `${TCGDEX_API}/sets?name=${encodeURIComponent(clean)}`;
  console.log(`[set-search] ${url}`);
  const data = await fetchJson(url);
  if (!Array.isArray(data) || data.length === 0) return null;
  const set = await fetchJson(`${TCGDEX_API}/sets/${data[0].id}`);
  return set?.logo ? set.logo + ".webp" : null;
}

// Strategy 5: Set partial - try individual keywords
async function searchSetPartial(name: string): Promise<string | null> {
  const clean = name
    .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case|pokemon|tcg|cards?)\b/gi, "")
    .replace(/[^a-zA-Z0-9 &]/g, "")
    .trim();
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  for (const word of words.slice(0, 3)) {
    const url = `${TCGDEX_API}/sets?name=${encodeURIComponent(word)}`;
    console.log(`[set-partial] "${word}"`);
    const data = await fetchJson(url);
    if (Array.isArray(data) && data.length > 0) {
      const set = await fetchJson(`${TCGDEX_API}/sets/${data[0].id}`);
      if (set?.logo) return set.logo + ".webp";
    }
  }
  return null;
}

function isSealedProduct(name: string, category: string): boolean {
  const sealedKeywords = /\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case)\b/i;
  return sealedKeywords.test(name) || sealedKeywords.test(category);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, searchTerm } = await req.json();
    const productName = searchTerm || name || "";
    const productCategory = category || "";

    if (!productName) {
      return new Response(JSON.stringify({ image_url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Searching image for: "${productName}" (category: ${productCategory})`);

    let imageUrl: string | null = null;
    const sealed = isSealedProduct(productName, productCategory);

    if (sealed) {
      imageUrl = await searchSet(productName);
      if (!imageUrl) imageUrl = await searchSetPartial(productName);
      if (!imageUrl) imageUrl = await searchCard(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
    } else {
      imageUrl = await searchCard(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
      if (!imageUrl) imageUrl = await searchCardFirstWord(productName);
      if (!imageUrl) imageUrl = await searchSet(productName);
    }

    console.log(`Result for "${productName}": ${imageUrl ? "✅ " + imageUrl : "❌ not found"}`);

    return new Response(JSON.stringify({ image_url: imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-product-image error:", e);
    return new Response(
      JSON.stringify({ image_url: null, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
