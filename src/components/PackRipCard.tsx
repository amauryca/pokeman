import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "./ProductCard";
import type { Product } from "@/hooks/useProducts";

interface PackRipCardProps {
  product: Product;
  index?: number;
  onViewDetail?: (product: Product) => void;
}

const PackRipCard = ({ product, index = 0, onViewDetail }: PackRipCardProps) => {
  const [ripped, setRipped] = useState(false);

  return (
    <motion.div
      className="relative cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15, duration: 0.5 }}
    >
      <AnimatePresence mode="wait">
        {!ripped ? (
          <motion.div
            key="pack"
            className="relative rounded-xl overflow-hidden select-none"
            onClick={() => setRipped(true)}
            whileHover={{ scale: 1.03, rotateZ: [-0.5, 0.5, -0.5, 0] }}
            whileTap={{ scale: 0.97 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {/* Pack wrapper */}
            <div className="relative aspect-[3/4] bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex flex-col items-center justify-center p-6 overflow-hidden">
              {/* Foil shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
              />

              {/* Pack texture lines */}
              <div className="absolute inset-0 opacity-10">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-full h-px bg-primary-foreground"
                    style={{ top: `${8 + i * 8}%` }}
                  />
                ))}
              </div>

              {/* Tear perforation line */}
              <motion.div
                className="absolute top-[18%] left-0 right-0 flex items-center justify-center gap-1.5 z-10"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-2 h-0.5 rounded-full bg-primary-foreground/60" />
                ))}
              </motion.div>

              {/* Pokéball watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-10">
                <div className="w-full h-1/2 rounded-t-full bg-primary-foreground" />
                <div className="w-full h-1/2 rounded-b-full bg-primary-foreground/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-4 border-primary-foreground/40 bg-primary-foreground" />
              </div>

              {/* Pack label */}
              <div className="relative z-10 text-center">
                <motion.p
                  className="text-primary-foreground/60 text-xs uppercase tracking-[0.2em] font-body"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Tap to open
                </motion.p>
                <h3 className="text-primary-foreground font-heading font-bold text-lg mt-2 leading-tight line-clamp-2 drop-shadow-md">
                  {product.name}
                </h3>
                <p className="text-primary-foreground/70 text-sm mt-1 font-body">{product.category}</p>
              </div>

              {/* Price tag */}
              <div className="absolute bottom-4 right-4 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold shadow-lg z-10">
                ${product.price.toFixed(2)}
              </div>

              {/* Edge seals */}
              <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-primary-foreground/20 rounded-tl-sm" />
              <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-primary-foreground/20 rounded-tr-sm" />
              <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-primary-foreground/20 rounded-bl-sm" />
              <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-primary-foreground/20 rounded-br-sm" />
            </div>
          </motion.div>
        ) : (
          <motion.div key="revealed">
            {/* Tear halves flying away */}
            <motion.div
              className="absolute inset-x-0 top-0 h-[18%] bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-t-xl z-20 origin-top overflow-hidden"
              initial={{ y: 0, rotateX: 0, opacity: 1 }}
              animate={{ y: -80, rotateX: -30, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5">
                {[...Array(16)].map((_, i) => (
                  <div key={i} className="w-2 h-0.5 rounded-full bg-primary-foreground/40" />
                ))}
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-x-0 bottom-0 h-[82%] bg-gradient-to-br from-primary via-primary/90 to-primary/70 rounded-b-xl z-20 origin-bottom overflow-hidden"
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: 60, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.05 }}
            />

            {/* Sparkle particles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-accent z-30"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${10 + Math.random() * 30}%`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                  y: [0, -30 - Math.random() * 40],
                  x: [(Math.random() - 0.5) * 60],
                }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.04, ease: "easeOut" }}
              />
            ))}

            {/* The actual product card revealed */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5, type: "spring", stiffness: 200 }}
            >
              <ProductCard product={product} index={0} onViewDetail={onViewDetail} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PackRipCard;
