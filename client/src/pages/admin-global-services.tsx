import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertGlobalServiceSchema, type GlobalService, type InsertGlobalService } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Loader2, ExternalLink, Settings2, Copy, Check, Globe, Key } from "lucide-react";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";

// Popular icon options for services
const ICON_OPTIONS = [
  "Globe", "Database", "Cloud", "Server", "Code", "Terminal", 
  "Lock", "Key", "Mail", "MessageSquare", "Calendar", "FileText",
  "Image", "Video", "Music", "ShoppingCart", "CreditCard", "BarChart",
  "Users", "User", "Home", "Settings", "Bell", "Search"
];

export default function AdminGlobalServicesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<GlobalService | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretServiceName, setSecretServiceName] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Check authentication and admin role
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    } else if (getUserRole() !== 'admin') {
      setLocation("/dashboard");
    }
  }, [setLocation]);

  if (!isAuthenticated() || getUserRole() !== 'admin') {
    return null;
  }

  // Fetch all global services (admin endpoint)
  const { data: services = [], isLoading } = useQuery<GlobalService[]>({
    queryKey: ["/api/admin/global-services"],
  });

  // Sort services alphabetically by name
  const sortedServices = [...services].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Form for adding/editing services
  const form = useForm<InsertGlobalService>({
    resolver: zodResolver(insertGlobalServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      url: "",
      redirectUrl: "",
      icon: "Globe",
      color: "",
    },
  });

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertGlobalService) => {
      const response = await apiRequest("POST", "/api/admin/global-services", data);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-services"] });
      setIsAddDialogOpen(false);
      form.reset();
      
      // Store the plaintext secret for display
      if (data.plaintextSecret) {
        setNewSecret(data.plaintextSecret);
        setSecretServiceName(data.name);
      }

      toast({
        title: "Service created",
        description: `${data.name} has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertGlobalService> }) => {
      return await apiRequest("PATCH", `/api/admin/global-services/${id}`, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-services"] });
      setEditingService(null);
      form.reset();

      toast({
        title: "Service updated",
        description: `${data.name} has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/global-services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-services"] });
      toast({
        title: "Service deleted",
        description: "Service has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  // Rotate secret mutation
  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/admin/global-services/${id}/rotate-secret`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/global-services"] });
      
      // Store the new plaintext secret for display
      if (data.plaintextSecret) {
        setNewSecret(data.plaintextSecret);
        const service = services.find(s => s.id === data.id);
        if (service) {
          setSecretServiceName(service.name);
        }
      }

      toast({
        title: "Secret rotated",
        description: "A new secret has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to rotate secret",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertGlobalService) => {
    // Clean up empty redirectUrl to prevent validation errors
    const cleanedData = {
      ...data,
      redirectUrl: data.redirectUrl?.trim() || undefined,
    };
    
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const handleEdit = (service: GlobalService) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description,
      url: service.url,
      redirectUrl: service.redirectUrl || "",
      icon: service.icon,
      color: service.color || "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this global service?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsAddDialogOpen(false);
      setEditingService(null);
      form.reset();
    }
  };

  const handleRotateSecret = (id: string) => {
    if (confirm("Are you sure you want to rotate the secret? The old secret will no longer work.")) {
      rotateSecretMutation.mutate(id);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSecret(id);
    toast({
      title: "Copied to clipboard",
      description: "Secret has been copied successfully",
    });
    setTimeout(() => setCopiedSecret(null), 2000);
  };

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Globe;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="heading-global-services">
                Global Services
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage the global service catalog for all users
              </p>
            </div>
            <Dialog open={isAddDialogOpen || !!editingService} onOpenChange={handleDialogClose}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-create-service">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Service
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingService ? "Edit Global Service" : "Create Global Service"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingService 
                      ? "Update the global service configuration" 
                      : "Add a new service to the global catalog"}
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="My SaaS Product" 
                              {...field} 
                              data-testid="input-service-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Authentication service for..." 
                              {...field} 
                              data-testid="input-service-description"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://myapp.com" 
                              {...field} 
                              data-testid="input-service-url"
                            />
                          </FormControl>
                          <FormDescription>
                            The main URL of your service
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="redirectUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Redirect URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://myapp.com/auth/callback" 
                              {...field} 
                              data-testid="input-service-redirect-url"
                            />
                          </FormControl>
                          <FormDescription>
                            Where to redirect after authentication (defaults to Service URL)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Icon</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-service-icon">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ICON_OPTIONS.map((icon) => {
                                const IconComponent = getIconComponent(icon);
                                return (
                                  <SelectItem key={icon} value={icon}>
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="w-4 h-4" />
                                      <span>{icon}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="hsl(var(--primary))" 
                              {...field} 
                              data-testid="input-service-color"
                            />
                          </FormControl>
                          <FormDescription>
                            CSS color value for the service card (e.g., hsl(217, 91%, 60%))
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleDialogClose(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-save-service"
                      >
                        {(createMutation.isPending || updateMutation.isPending) && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        {editingService ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Secret Display Dialog */}
          {newSecret && (
            <Card className="border-primary" data-testid="card-new-secret">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-primary" />
                  Service Secret Generated
                </CardTitle>
                <CardDescription>
                  Secret for: <strong>{secretServiceName}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
                  <p className="text-sm text-destructive font-semibold">
                    ⚠️ Save this secret now - it won't be shown again!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This secret is used to sign JWT tokens and authenticate widget logins. Store it securely.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Secret Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono bg-muted p-3 rounded border select-all break-all">
                      {newSecret}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newSecret, 'new-secret')}
                      data-testid="button-copy-secret"
                    >
                      {copiedSecret === 'new-secret' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setNewSecret(null)}
                  className="w-full"
                  data-testid="button-close-secret"
                >
                  I've saved the secret
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Services Table */}
          <Card data-testid="card-services-table">
            <CardHeader>
              <CardTitle>Global Services Catalog</CardTitle>
              <CardDescription>
                {services.length === 0
                  ? "No global services yet. Create your first service."
                  : `${services.length} service${services.length === 1 ? "" : "s"} in catalog`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No global services configured yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>Secret</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedServices.map((service) => {
                        const IconComponent = getIconComponent(service.icon);
                        return (
                          <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ backgroundColor: service.color || 'hsl(var(--primary))' }}
                                >
                                  <IconComponent className="w-5 h-5 text-primary-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm" data-testid={`text-service-name-${service.id}`}>
                                    {service.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {service.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <a
                                href={service.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                                data-testid={`link-service-url-${service.id}`}
                              >
                                {service.url.replace(/^https?:\/\//, '')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                  {service.secretPreview}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRotateSecret(service.id)}
                                  data-testid={`button-rotate-secret-${service.id}`}
                                >
                                  <Settings2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEdit(service)}
                                  data-testid={`button-edit-${service.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(service.id)}
                                  data-testid={`button-delete-${service.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
