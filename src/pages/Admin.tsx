import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, LogOut, Package, ClipboardList } from "lucide-react";

const categories = ["Trading Cards", "Booster Boxes", "Elite Trainer Boxes"];

const Admin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: products, isLoading: productsLoading } = useProducts();
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");

  // New product form
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCategory, setNewCategory] = useState("Trading Cards");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate("/admin/login");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate("/admin/login");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // Order requests
  const { data: orders } = useQuery({
    queryKey: ["order_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Mutations
  const addProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").insert({
        name: newName,
        price: parseFloat(newPrice),
        quantity: parseInt(newQty),
        category: newCategory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setNewName(""); setNewPrice(""); setNewQty("");
      setDialogOpen(false);
      toast({ title: "Product added!" });
    },
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  const updateProduct = useMutation({
    mutationFn: async (updates: Partial<Product> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("products").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("order_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order_requests"] }),
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="font-heading font-bold text-lg">PokéMarket Admin</h1>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="container py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
          >
            <Package className="h-4 w-4 mr-1" /> Products
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
          >
            <ClipboardList className="h-4 w-4 mr-1" /> Orders
            {orders && orders.filter((o: any) => o.status === "pending").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {orders.filter((o: any) => o.status === "pending").length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-heading">Products ({products?.length ?? 0})</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Input type="number" placeholder="Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    <Input type="number" placeholder="Quantity" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={() => addProduct.mutate()} disabled={!newName || !newPrice || !newQty}>
                      Add Product
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Sold</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.category}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-20 h-8"
                            defaultValue={p.price}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (val !== p.price) updateProduct.mutate({ id: p.id, price: val });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateProduct.mutate({ id: p.id, quantity: Math.max(0, p.quantity - 1) })}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{p.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateProduct.mutate({ id: p.id, quantity: p.quantity + 1 })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={p.status === "sold"}
                            onCheckedChange={(checked) =>
                              updateProduct.mutate({ id: p.id, status: checked ? "sold" : "available" })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteProduct.mutate(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Order Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="text-sm">{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{o.customer_name}</TableCell>
                        <TableCell className="text-sm">{o.email}</TableCell>
                        <TableCell className="text-sm">
                          {(o.products_requested as any[])?.map((p: any) => `${p.name} (x${p.quantity})`).join(", ")}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={o.status}
                            onValueChange={(val) => updateOrderStatus.mutate({ id: o.id, status: val })}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Admin;
