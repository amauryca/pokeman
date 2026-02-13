import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag, Mail, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import SplashScreen from "@/components/SplashScreen";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const { data: products } = useProducts();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const featured = products?.filter((p) => p.status !== "sold" && p.quantity > 0).slice(0, 3) ?? [];

  return (
    <>
      <SplashScreen show={showSplash} />
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-primary text-primary-foreground">
          <div className="container py-20 md:py-32">
            <motion.div
              className="max-w-2xl"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight">
                Your Pokémon
                <br />
                <span className="text-pokemon-yellow">Collection</span> Starts Here
              </h1>
              <p className="mt-6 text-lg text-primary-foreground/80 max-w-lg">
                Hey! I'm selling Pokémon trading cards, booster boxes, and Elite Trainer Boxes 
                to help pay for college and save for a car. Browse my inventory and reach out!
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg" variant="secondary">
                  <Link to="/products">
                    Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  <Link to="/order">Contact Me</Link>
                </Button>
              </div>
            </motion.div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary-foreground/5" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-pokemon-yellow/10" />
        </section>

        {/* How it works */}
        <section className="container py-16">
          <h2 className="font-heading text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShoppingBag, title: "Browse", desc: "Check out my available Pokémon products" },
              { icon: Mail, title: "Contact Me", desc: "Fill out a quick form with what you want" },
              { icon: Package, title: "Get Your Cards", desc: "I'll follow up to arrange your order" },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                className="text-center p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-lg">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        {featured.length > 0 && (
          <section className="container pb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-heading text-2xl font-bold">Featured Products</h2>
              <Button asChild variant="ghost">
                <Link to="/products">View All <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-8">
          <div className="container text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} PokéMarket. Built with ❤️ for Pokémon fans.</p>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Index;
