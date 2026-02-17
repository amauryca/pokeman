import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const NewsletterSignup = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("loading");
    const { error } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: trimmed });

    if (error) {
      setStatus("idle");
      if (error.code === "23505") {
        toast({ title: "Already subscribed!", description: "This email is already on our list." });
      } else {
        toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
      }
      return;
    }

    setStatus("success");
    setEmail("");
    toast({ title: "Subscribed! 🎉", description: "You'll be the first to know about new drops." });

    // Send notification email (fire-and-forget)
    supabase.functions.invoke("newsletter-notification", {
      body: { email: trimmed },
    }).catch(console.error);
  };

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container py-16">
        <motion.div
          className="mx-auto max-w-xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Mail className="mx-auto mb-4 h-10 w-10 text-pokemon-yellow" />
          <h2 className="font-heading text-2xl font-bold">Stay in the Loop</h2>
          <p className="mt-2 text-primary-foreground/80 text-sm">
            Get notified when new cards, booster boxes, and ETBs drop. No spam — just Pokémon.
          </p>

          {status === "success" ? (
            <motion.div
              className="mt-6 flex items-center justify-center gap-2 text-pokemon-yellow font-medium"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <CheckCircle className="h-5 w-5" />
              You're on the list!
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 flex gap-2 sm:flex-row flex-col">
              <Input
                type="email"
                required
                maxLength={255}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 flex-1"
              />
              <Button type="submit" variant="secondary" disabled={status === "loading"} className="shrink-0">
                {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default NewsletterSignup;
