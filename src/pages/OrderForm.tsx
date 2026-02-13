import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "@/hooks/use-toast";

const orderSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const OrderForm = () => {
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("product");
  const { data: products } = useProducts();
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: { customer_name: "", email: "", phone: "", notes: "" },
  });

  // Pre-select product from URL
  useEffect(() => {
    if (preselected && products) {
      const found = products.find((p) => p.name === preselected);
      if (found && found.quantity > 0) {
        setSelectedProducts((prev) => ({ ...prev, [found.name]: 1 }));
      }
    }
  }, [preselected, products]);

  const toggleProduct = (name: string) => {
    setSelectedProducts((prev) => {
      const copy = { ...prev };
      if (copy[name]) {
        delete copy[name];
      } else {
        copy[name] = 1;
      }
      return copy;
    });
  };

  const updateQty = (name: string, qty: number) => {
    if (qty < 1) return;
    setSelectedProducts((prev) => ({ ...prev, [name]: qty }));
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (Object.keys(selectedProducts).length === 0) {
      toast({ title: "Please select at least one product", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const productsRequested = Object.entries(selectedProducts).map(([name, qty]) => ({
        name,
        quantity: qty,
      }));

      const { error } = await supabase.from("order_requests").insert({
        customer_name: values.customer_name,
        email: values.email,
        phone: values.phone || null,
        products_requested: productsRequested,
        notes: values.notes || null,
      });

      if (error) throw error;

      // Also trigger email via edge function
      try {
        await supabase.functions.invoke("send-order-email", {
          body: {
            customer_name: values.customer_name,
            email: values.email,
            phone: values.phone,
            products: productsRequested,
            notes: values.notes,
          },
        });
      } catch {
        // Email is best-effort, don't fail the order
      }

      setSubmitted(true);
    } catch (err) {
      toast({ title: "Something went wrong", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const availableProducts = products?.filter((p) => p.status !== "sold" && p.quantity > 0) ?? [];

  if (submitted) {
    return (
      <>
        <Navbar />
        <main className="container py-20">
          <motion.div
            className="max-w-md mx-auto text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="font-heading text-3xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground">
              Your order request has been submitted. I'll get back to you shortly to confirm 
              availability and discuss details.
            </p>
          </motion.div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container py-8 max-w-2xl">
        <h1 className="font-heading text-3xl font-bold mb-2">Order Request</h1>
        <p className="text-muted-foreground mb-8">
          Fill out the form below and I'll get back to you about availability.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Select Products *</label>
              {availableProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products currently available</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                  {availableProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={!!selectedProducts[p.name]}
                          onCheckedChange={() => toggleProduct(p.name)}
                        />
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-muted-foreground">${p.price.toFixed(2)}</span>
                      </div>
                      {selectedProducts[p.name] && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 text-xs"
                            onClick={() => updateQty(p.name, selectedProducts[p.name] - 1)}
                          >
                            -
                          </Button>
                          <span className="w-6 text-center text-sm">{selectedProducts[p.name]}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 text-xs"
                            onClick={() => updateQty(p.name, Math.min(selectedProducts[p.name] + 1, p.quantity))}
                          >
                            +
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any questions or special requests?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Order Request"}
            </Button>
          </form>
        </Form>
      </main>
    </>
  );
};

export default OrderForm;
