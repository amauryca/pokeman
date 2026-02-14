import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type Product } from "@/hooks/useProducts";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, LogOut, Package, ClipboardList, ImagePlus, Images, FileSpreadsheet } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import MultiImageUpload from "@/components/MultiImageUpload";
import ExcelUpload from "@/components/ExcelUpload";

const categories = [
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
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [newGalleryImages, setNewGalleryImages] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [galleryDialogProduct, setGalleryDialogProduct] = useState<Product | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [isAuthorized, setIsAuthorized] = useState(false);

  // Auth + admin role check
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast({ title: "Access denied", description: "Admin privileges required", variant: "destructive" });
        navigate("/");
        return;
      }
      setIsAuthorized(true);
    };

    checkAdmin();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        setIsAuthorized(false);
        navigate("/admin/login");
      }
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
      const { data, error } = await supabase.from("products").insert({
        name: newName,
        price: parseFloat(newPrice),
        quantity: parseInt(newQty),
        category: newCategory,
        description: newDescription || null,
        image_url: newImageUrl,
      }).select().single();
      if (error) throw error;
      if (newGalleryImages.length > 0) {
        const { error: imgError } = await supabase.from("product_images").insert(
          newGalleryImages.map((url, i) => ({ product_id: data.id, image_url: url, sort_order: i }))
        );
        if (imgError) throw imgError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setNewName(""); setNewPrice(""); setNewQty(""); setNewImageUrl(null); setNewDescription(""); setNewGalleryImages([]);
      setDialogOpen(false);
      toast({ title: "Product added!" });
    },
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  const saveGalleryImages = useMutation({
    mutationFn: async ({ productId, images }: { productId: string; images: string[] }) => {
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (images.length > 0) {
        const { error } = await supabase.from("product_images").insert(
          images.map((url, i) => ({ product_id: productId, image_url: url, sort_order: i }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setGalleryDialogProduct(null);
      toast({ title: "Gallery updated!" });
    },
    onError: () => toast({ title: "Failed to update gallery", variant: "destructive" }),
  });

  const updateProduct = useMutation({
    mutationFn: async (updates: Partial<Product> & { id: string }) => {
      const { id, ...rest } = updates;
      const { error } = await supabase.from("products").update(rest).eq("id", id);
      if (error) throw error;
      return { id, ...rest };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Send stock notification for quantity/status changes
      if (data && ("quantity" in data || "status" in data)) {
        const product = products?.find((p) => p.id === data.id);
        if (product) {
          const qty = data.quantity ?? product.quantity;
          const status = data.status ?? product.status;
          supabase.functions.invoke("stock-change-notification", {
            body: {
              changes: [{ name: product.name, price: product.price, quantity: qty, status }],
              type: "stock_update",
            },
          }).catch(() => {});
        }
      }
    },
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

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking admin access...</p>
      </div>
    );
  }

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
              <div className="flex items-center gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Product</Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    <Input placeholder="Product name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    <Textarea placeholder="Description (optional)" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} />
                    <Input type="number" placeholder="Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                    <Input type="number" placeholder="Quantity" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
                    <Select value={newCategory} onValueChange={setNewCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div>
                      <p className="text-sm font-medium mb-1">Main Image</p>
                      <ImageUpload value={newImageUrl} onChange={setNewImageUrl} />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Gallery Images</p>
                      <MultiImageUpload images={newGalleryImages} onChange={setNewGalleryImages} />
                    </div>
                    <Button className="w-full" onClick={() => addProduct.mutate()} disabled={!newName || !newPrice || !newQty}>
                      Add Product
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel Upload</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Products from Excel</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload an Excel or CSV file with columns: <strong>Name, Price, Quantity, Category, Description</strong>.
                      Duplicates (matching by name) will be skipped automatically.
                    </p>
                    <ExcelUpload
                      existingProducts={products ?? []}
                      onComplete={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
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
                        <TableCell>
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <label className="w-full h-full flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                                <ImagePlus className="h-4 w-4" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    const ext = file.name.split(".").pop();
                                    const path = `${crypto.randomUUID()}.${ext}`;
                                    const { error } = await supabase.storage.from("product-images").upload(path, file);
                                    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
                                    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
                                    updateProduct.mutate({ id: p.id, image_url: urlData.publicUrl });
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </TableCell>
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
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Manage gallery"
                              onClick={() => {
                                setGalleryDialogProduct(p);
                                setGalleryImages(p.product_images?.map(img => img.image_url) || []);
                              }}
                            >
                              <Images className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteProduct.mutate(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Gallery Management Dialog */}
      <Dialog open={!!galleryDialogProduct} onOpenChange={(open) => { if (!open) setGalleryDialogProduct(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gallery — {galleryDialogProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <Textarea
                defaultValue={galleryDialogProduct?.description || ""}
                placeholder="Add a description..."
                rows={3}
                onBlur={(e) => {
                  if (galleryDialogProduct) {
                    updateProduct.mutate({ id: galleryDialogProduct.id, description: e.target.value || null });
                  }
                }}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Gallery Images</p>
              <MultiImageUpload images={galleryImages} onChange={setGalleryImages} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (galleryDialogProduct) {
                  saveGalleryImages.mutate({ productId: galleryDialogProduct.id, images: galleryImages });
                }
              }}
            >
              Save Gallery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
