import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";

const categories = [
  "All",
  "Booster Packs",
  "Booster Boxes",
  "Booster Bundles",
  "Elite Trainer Boxes",
  "Ultra Premium Collections",
  "Collection Boxes",
  "Tins",
  "Blisters",
  "Build & Battle Boxes",
  "Trainer Kits",
  "Special Sets",
  "Single Cards",
  "Accessories",
];

const Products = () => {
  const { data: products, isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = activeCategory === "All" || p.category === activeCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, activeCategory]);

  return (
    <>
      <Navbar />
      <main className="container py-8">
        <h1 className="font-heading text-3xl font-bold mb-2">Product Catalog</h1>
        <p className="text-muted-foreground mb-8">Browse available Pokémon merchandise</p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-80 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 text-muted-foreground"
          >
            <p className="text-lg">No products found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </motion.div>
        ) : (
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </>
  );
};

export default Products;
