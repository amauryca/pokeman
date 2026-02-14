import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface ParsedProduct {
  name: string;
  price: number;
  quantity: number;
  category: string;
  description?: string | null;
  autoImage: boolean;
  selected: boolean;
}

const POKEMON_TCG_API = "https://api.pokemontcg.io/v2/cards";

async function fetchPokemonImage(productName: string): Promise<string | null> {
  try {
    const searchName = productName.replace(/[^a-zA-Z0-9 ]/g, "").trim();
    const res = await fetch(`${POKEMON_TCG_API}?q=name:"${encodeURIComponent(searchName)}"&pageSize=1`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0]?.images?.large || data.data?.[0]?.images?.small || null;
  } catch {
    return null;
  }
}

interface Props {
  existingProducts: Product[];
  onComplete: () => void;
}

const TxtUpload = ({ existingProducts, onComplete }: Props) => {
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ParsedProduct[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke("parse-product-text", {
        body: { text: rawText },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        setParsing(false);
        return;
      }

      const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase().trim()));
      const parsed: ParsedProduct[] = [];
      const dupes: string[] = [];

      for (const item of data.products || []) {
        const name = String(item.name || "").trim();
        if (!name) continue;

        if (existingNames.has(name.toLowerCase())) {
          dupes.push(name);
          continue;
        }

        parsed.push({
          name,
          price: parseFloat(item.price) || 0,
          quantity: parseInt(item.quantity) || 1,
          category: item.category || "Trading Cards",
          description: item.description || null,
          autoImage: true,
          selected: true,
        });
      }

      setPreview(parsed);
      setSkipped(dupes);

      if (dupes.length > 0) {
        toast({
          title: `${dupes.length} duplicate(s) skipped`,
          description: dupes.slice(0, 3).join(", ") + (dupes.length > 3 ? "..." : ""),
        });
      }

      if (parsed.length === 0 && dupes.length === 0) {
        toast({ title: "No products found in text", variant: "destructive" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to parse text", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!preview) return;
    const selected = preview.filter((p) => p.selected);
    if (selected.length === 0) return;
    setUploading(true);

    try {
      let added = 0;
      for (const item of selected) {
        const status = item.quantity <= 0 ? "sold" : "available";
        const imageUrl = item.autoImage ? await fetchPokemonImage(item.name) : null;

        const { error } = await supabase.from("products").insert({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          description: item.description || null,
          image_url: imageUrl,
          status,
        });

        if (!error) added++;
      }

      toast({ title: `${added} product(s) added successfully!` });
      setPreview(null);
      setSkipped([]);
      setRawText("");
      onComplete();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleItem = (idx: number, field: "selected" | "autoImage", value: boolean) => {
    setPreview((prev) =>
      prev?.map((item, i) => (i === idx ? { ...item, [field]: value } : item)) ?? null
    );
  };

  return (
    <div className="space-y-4">
      {!preview ? (
        <div className="space-y-3">
          <Textarea
            placeholder={"Paste your product list here...\n\nExample:\nCharizard VMAX - $45 x2\nPikachu V, $12, qty 5\nBooster Box Scarlet & Violet $120"}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={8}
          />
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setRawText(ev.target?.result as string || "");
                  reader.readAsText(file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium cursor-pointer">
                <FileText className="h-4 w-4" />
                Load .txt File
              </div>
            </label>
            <Button onClick={handleParse} disabled={parsing || !rawText.trim()} className="flex-1">
              {parsing ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> AI is parsing...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Parse with AI</>
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border rounded-lg p-3 max-h-56 overflow-y-auto">
            <p className="text-sm font-medium mb-2">
              {preview.filter((p) => p.selected).length} product(s) selected
              {skipped.length > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({skipped.length} duplicate(s) skipped)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {preview.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={p.selected}
                    onCheckedChange={(v) => toggleItem(i, "selected", v)}
                    className="scale-75"
                  />
                  <span className={`truncate flex-1 ${!p.selected ? "line-through text-muted-foreground" : ""}`}>
                    {p.name}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap text-xs">
                    ${p.price.toFixed(2)} · Qty: {p.quantity} · {p.category}
                  </span>
                  <div className="flex items-center gap-1" title="Auto-fetch image">
                    <span className="text-xs text-muted-foreground">Img</span>
                    <Switch
                      checked={p.autoImage}
                      onCheckedChange={(v) => toggleItem(i, "autoImage", v)}
                      className="scale-75"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={uploading || preview.filter((p) => p.selected).length === 0}
              className="flex-1"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-1" /> Upload {preview.filter((p) => p.selected).length} Product(s)</>
              )}
            </Button>
            <Button variant="outline" onClick={() => { setPreview(null); setSkipped([]); }}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TxtUpload;
