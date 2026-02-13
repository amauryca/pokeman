import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  status: string;
  image_url: string | null;
}

interface ProductCardProps {
  product: Product;
  index?: number;
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

const getImageUrl = (name: string, imageUrl: string | null) => {
  if (imageUrl) return imageUrl;
  // Fallback to Pokemon TCG API-style placeholder
  const encoded = encodeURIComponent(name.split(" ")[0]);
  return `https://images.pokemontcg.io/base1/${Math.floor(Math.random() * 102) + 1}_hires.png`;
};

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const isSoldOut = product.status === "sold" || product.quantity === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={product.image_url || "/placeholder.svg"}
            alt={product.name}
            className={`w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105 ${
              isSoldOut ? "opacity-50 grayscale" : ""
            }`}
            loading="lazy"
          />
          <div className="absolute top-3 right-3">{getStatusBadge(product)}</div>
        </div>
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
            <h3 className="font-heading font-semibold text-lg leading-tight mt-1">{product.name}</h3>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-primary">${product.price.toFixed(2)}</span>
            <Button asChild size="sm" disabled={isSoldOut} variant={isSoldOut ? "outline" : "default"}>
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
