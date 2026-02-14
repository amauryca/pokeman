import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2";

// Strategy 1: Exact card name search
async function searchCardExact(name: string): Promise<string | null> {
  try {
    const clean = name.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    const res = await fetch(`${POKEMON_TCG_API}/cards?q=name:"${encodeURIComponent(clean)}"&pageSize=1&select=images`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.large || data.data?.[0]?.images?.small || null;
  } catch { return null; }
}

// Strategy 2: Partial/fuzzy card name search (first word or two)
async function searchCardPartial(name: string): Promise<string | null> {
  try {
    const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
    const searchTerm = words.slice(0, 2).join(" ");
    if (!searchTerm) return null;
    const res = await fetch(`${POKEMON_TCG_API}/cards?q=name:"${encodeURIComponent(searchTerm)}"&pageSize=1&select=images`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.large || data.data?.[0]?.images?.small || null;
  } catch { return null; }
}

// Strategy 3: Search by set name (for sealed products like booster boxes, ETBs)
async function searchSetImage(name: string): Promise<string | null> {
  try {
    // Extract likely set names from product name
    const clean = name
      .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case)\b/gi, "")
      .replace(/[^a-zA-Z0-9 &]/g, "")
      .trim();
    if (!clean) return null;

    const res = await fetch(`${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(clean)}"&pageSize=1&select=images,name`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.logo || data.data?.[0]?.images?.symbol || null;
  } catch { return null; }
}

// Strategy 4: Search set by partial name
async function searchSetPartial(name: string): Promise<string | null> {
  try {
    const clean = name
      .replace(/\b(booster|box|pack|bundle|elite|trainer|collection|tin|blister|premium|ultra|build|battle|kit|etb|display|case|pokemon|tcg|cards?)\b/gi, "")
      .replace(/[^a-zA-Z0-9 &]/g, "")
      .trim();
    const words = clean.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return null;

    // Try each significant word as a set search
    for (const word of words.slice(0, 3)) {
      const res = await fetch(`${POKEMON_TCG_API}/sets?q=name:"${encodeURIComponent(word)}"&pageSize=1&select=images`);
      if (!res.ok) continue;
      const data = await res.json();
      const img = data.data?.[0]?.images?.logo || data.data?.[0]?.images?.symbol;
      if (img) return img;
    }
    return null;
  } catch { return null; }
}

// Strategy 5: Wildcard card name search
async function searchCardWildcard(name: string): Promise<string | null> {
  try {
    const words = name.replace(/[^a-zA-Z0-9 ]/g, "").trim().split(/\s+/);
    const first = words[0];
    if (!first || first.length < 3) return null;
    const res = await fetch(`${POKEMON_TCG_API}/cards?q=name:${encodeURIComponent(first)}*&pageSize=1&select=images`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.large || data.data?.[0]?.images?.small || null;
  } catch { return null; }
}

// Determine if this is likely a sealed product vs a single card
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
      // For sealed products: try set images first, then cards as fallback
      imageUrl = await searchSetImage(productName);
      if (!imageUrl) imageUrl = await searchSetPartial(productName);
      if (!imageUrl) imageUrl = await searchCardExact(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
    } else {
      // For single cards: try card searches first, then sets as fallback
      imageUrl = await searchCardExact(productName);
      if (!imageUrl) imageUrl = await searchCardPartial(productName);
      if (!imageUrl) imageUrl = await searchCardWildcard(productName);
      if (!imageUrl) imageUrl = await searchSetImage(productName);
    }

    console.log(`Image result for "${productName}": ${imageUrl ? "found" : "not found"}`);

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
