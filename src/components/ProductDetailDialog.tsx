import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/hooks/useProducts";

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getStatusBadge = (product: Product) => {
  if (product.status === "sold" || product.quantity === 0) {
    return <Badge variant="destructive">Sold Out</Badge>;
  }
  if (product.quantity <= 3) {
    return <Badge className="bg-pokemon-yellow text-accent-foreground">Low Stock ({product.quantity})</Badge>;
  }
  return <Badge variant="secondary">In Stock ({product.quantity})</Badge>;
};

const ProductDetailDialog = ({ product, open, onOpenChange }: ProductDetailDialogProps) => {
  const [currentImage, setCurrentImage] = useState(0);

  if (!product) return null;

  // Gather all images: main image + gallery images
  const allImages: string[] = [];
  if (product.image_url) allImages.push(product.image_url);
  if (product.product_images) {
    for (const img of product.product_images) {
      if (!allImages.includes(img.image_url)) allImages.push(img.image_url);
    }
  }
  if (allImages.length === 0) allImages.push("/placeholder.svg");

  const isSoldOut = product.status === "sold" || product.quantity === 0;

  const prev = () => setCurrentImage((c) => (c === 0 ? allImages.length - 1 : c - 1));
  const next = () => setCurrentImage((c) => (c === allImages.length - 1 ? 0 : c + 1));

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setCurrentImage(0); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              <img
                src={allImages[currentImage]}
                alt={product.name}
                className="w-full h-full object-contain p-4"
              />
              {allImages.length > 1 && (
                <>
                  <Button variant="ghost" size="icon" className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/70" onClick={prev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 bg-background/70" onClick={next}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-14 h-14 rounded border-2 overflow-hidden flex-shrink-0 transition-colors ${
                      i === currentImage ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getStatusBadge(product)}
              <Badge variant="outline">{product.category}</Badge>
            </div>
            <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
            {product.description && (
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
                <p className="text-sm leading-relaxed">{product.description}</p>
              </div>
            )}
            <Button asChild className="w-full" disabled={isSoldOut} variant={isSoldOut ? "outline" : "default"}>
              <Link to={`/order?product=${encodeURIComponent(product.name)}`}>
                {isSoldOut ? "Sold Out" : "Contact Me"}
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailDialog;
