import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import type { Product } from "@/hooks/useProducts";

interface ProductCardProps {
  product: Product;
  index?: number;
  onViewDetail?: (product: Product) => void;
}

const getStatusBadge = (product: Product) => {
  if (product.status === "occur") {
    return (
      <Badge variant="occur" className="animate-fade-in-up">
        Coming Soon
      </Badge>
    );
  }
  if (product.status === "sold" || product.quantity === 0) {
    return <Badge variant="destructive">Sold Out</Badge>;
  }
  if (product.quantity <= 3) {
    return <Badge className="bg-pokemon-yellow text-accent-foreground">Low Stock ({product.quantity})</Badge>;
  }
  return <Badge variant="secondary">In Stock ({product.quantity})</Badge>;
};

const ProductCard = ({ product, index = 0, onViewDetail }: ProductCardProps) => {
  const isSoldOut = product.status === "sold" || product.quantity === 0;
  const isOccur = product.status === "occur";
  const displayImage = product.image_url || product.product_images?.[0]?.image_url || "/placeholder.svg";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ delay: index * 0.04, duration: 0.35, type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        onClick={() => onViewDetail?.(product)}
      >
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={displayImage}
            alt={product.name}
            className={`w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110 ${
              isSoldOut ? "opacity-50 grayscale" : isOccur ? "grayscale" : ""
            }`}
            loading="lazy"
          />
          <div className="absolute top-3 right-3">{getStatusBadge(product)}</div>

          {/* Gallery indicator */}
          {product.product_images && product.product_images.length > 0 && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="text-xs">
                {(product.image_url ? 1 : 0) + product.product_images.length} photos
              </Badge>
            </div>
          )}

          {/* Hover reveal overlay */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-t from-foreground/90 via-foreground/60 to-transparent p-4 pt-10">
            <p className="text-background text-sm font-medium font-heading">{product.name}</p>
            <p className="text-background/70 text-xs mt-1">{product.category}</p>
            <p className="text-primary-foreground text-lg font-bold mt-1 text-primary drop-shadow-sm">
              ${product.price.toFixed(2)}
            </p>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
            <h3 className="font-heading font-semibold text-lg leading-tight mt-1">{product.name}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">${product.price.toFixed(2)}</span>
            <Button
              asChild
              size="sm"
              disabled={isSoldOut}
              variant={isSoldOut ? "outline" : "default"}
              onClick={(e) => e.stopPropagation()}
            >
              <Link to={`/order?product=${encodeURIComponent(product.name)}`}>
                {isSoldOut ? "Sold Out" : "Contact Me"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ProductCard;
