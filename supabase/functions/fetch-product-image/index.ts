import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

async function fetchJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text();
      console.log(`HTTP ${res.status} for ${url}: ${body.substring(0, 200)}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.error(`Fetch error: ${e}`);
    return null;
  }
}

// Strategy 1: Exact card name search
async function searchCardExact(name: string): Promise<string | null> {
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
  // Don't encode the structural parts of the query - only encode the search term
  const url = `${POKEMON_TCG_API}/cards?q=name:"${encodeURIComponent(clean)}"&pageSize=1&select=images`;
  console.log(`[exact] ${url}`);
  const data = await fetchJson(url);
  return data?.data?.[0]?.images?.large || data?.data?.[0]?.images?.small || null;
}

// Strategy 2: Partial name (first 1-2 words)
async function searchCardPartial(name: string): Promise<string | null> {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const term = words.slice(0, 2).join(" ");
  if (!term) return null;
  const url = `${POKEMON_TCG_API}/cards?q=name:"${encodeURIComponent(term)}"&pageSize=1&select=images`;
  console.log(`[partial] ${url}`);
  const data = await fetchJson(url);
  return data?.data?.[0]?.images?.large || data?.data?.[0]?.images?.small || null;
}

// Strategy 3: Set image search
async function searchSetImage(name: string): Promise<string | null> {
  const clean = name
    .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case)\b/gi, "")
    .replace(/[^a-zA-Z0-9 &]/g, "")
    .trim();
  if (!clean) return null;
  const url = `${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(clean)}"&pageSize=1&select=images,name`;
  console.log(`[set] ${url}`);
  const data = await fetchJson(url);
  return data?.data?.[0]?.images?.logo || data?.data?.[0]?.images?.symbol || null;
}

// Strategy 4: Set partial search
async function searchSetPartial(name: string): Promise<string | null> {
  const clean = name
    .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case|pokemon|tcg|cards?)\b/gi, "")
    .replace(/[^a-zA-Z0-9 &]/g, "")
    .trim();
  const words = clean.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return null;
  for (const word of words.slice(0, 3)) {
    const url = `${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(word)}"&pageSize=1&select=images`;
    console.log(`[set-partial] "${word}"`);
    const data = await fetchJson(url);
    const img = data?.data?.[0]?.images?.logo || data?.data?.[0]?.images?.symbol;
    if (img) return img;
  }
  return null;
}

// Strategy 5: Wildcard search
async function searchCardWildcard(name: string): Promise<string | null> {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
  const first = words[0];
  if (!first || first.length < 3) return null;
  const url = `${POKEMON_TCG_API}/cards?q=name:${encodeURIComponent(first)}*&pageSize=1&select=images`;
  console.log(`[wildcard] ${url}`);
  const data = await fetchJson(url);
  return data?.data?.[0]?.images?.large || data?.data?.[0]?.images?.small || null;
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
      imageUrl = await searchSetImage(productName);
      if (!imageUrl) imageUrl = await searchSetPartial(productName);
      if (!imageUrl) imageUrl = await searchCardExact(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
    } else {
      imageUrl = await searchCardExact(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
      if (!imageUrl) imageUrl = await searchCardWildcard(productName);
      if (!imageUrl) imageUrl = await searchSetImage(productName);
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
