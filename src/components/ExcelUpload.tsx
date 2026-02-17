import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface ExcelProduct {
  name: string;
  price: number;
  quantity: number;
  category: string;
  description?: string;
}


interface Props {
  existingProducts: Product[];
  onComplete: () => void;
  onProductsAdded?: (products: Array<{ name: string; price: number; quantity: number; status: string }>) => void;
}

const ExcelUpload = ({ existingProducts, onComplete, onProductsAdded }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<ExcelProduct[] | null>(null);
  const [skipped, setSkipped] = useState<string[]>([]);

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

        const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase().trim()));
        const parsed: ExcelProduct[] = [];
        const dupes: string[] = [];

        for (const row of rows) {
          const name = String(row["Name"] || row["name"] || row["Product"] || row["product"] || "").trim();
          if (!name) continue;

          if (existingNames.has(name.toLowerCase())) {
            dupes.push(name);
            continue;
          }

          parsed.push({
            name,
            price: parseFloat(row["Price"] || row["price"] || 0),
            quantity: parseInt(row["Quantity"] || row["quantity"] || row["Qty"] || row["qty"] || 0),
            category: String(row["Category"] || row["category"] || "Trading Cards"),
            description: row["Description"] || row["description"] || undefined,
            
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
      } catch {
        toast({ title: "Failed to parse file", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!preview || preview.length === 0) return;
    setUploading(true);

    try {
      let added = 0;
      const stockChanges: Array<{ name: string; price: number; quantity: number; status: string }> = [];

      for (const item of preview) {
        const status = item.quantity <= 0 ? "sold" : "available";

        const { error } = await supabase.from("products").insert({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: item.category,
          description: item.description || null,
          image_url: null,
          status,
        });

        if (!error) {
          added++;
          stockChanges.push({ name: item.name, price: item.price, quantity: item.quantity, status });
        }
      }

      // Track for batch notification instead of sending immediately
      if (stockChanges.length > 0 && onProductsAdded) {
        onProductsAdded(stockChanges);
      }

      toast({ title: `${added} product(s) added successfully!` });
      setPreview(null);
      setSkipped([]);
      onComplete();
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" />
            Choose Excel/CSV File
          </div>
        </label>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
            <p className="text-sm font-medium mb-2">
              {preview.length} new product(s) to add
              {skipped.length > 0 && (
                <span className="text-muted-foreground ml-1">
                  ({skipped.length} duplicate(s) skipped)
                </span>
              )}
            </p>
            <div className="space-y-2">
              {preview.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate flex-1">{p.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    ${p.price.toFixed(2)} · Qty: {p.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={uploading || preview.length === 0} className="flex-1">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-1" /> Upload {preview.length} Product(s)
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => { setPreview(null); setSkipped([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
