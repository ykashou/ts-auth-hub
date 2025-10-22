import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceSchema, type Service, type InsertService } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Trash2, Loader2, ExternalLink, Settings2, Copy, Check } from "lucide-react";
import * as Icons from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";
import Navbar from "@/components/Navbar";

// Popular icon options for services
const ICON_OPTIONS = [
  "Globe", "Database", "Cloud", "Server", "Code", "Terminal", 
  "Lock", "Key", "Mail", "MessageSquare", "Calendar", "FileText",
  "Image", "Video", "Music", "ShoppingCart", "CreditCard", "BarChart",
  "Users", "User", "Home", "Settings", "Bell", "Search"
];

export default function Config() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [secretServiceName, setSecretServiceName] = useState<string>("");
  const [copiedSecret, setCopiedSecret] = useState<string | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  if (!isAuthenticated()) {
    return null;
  }


  // Fetch all services with secrets (admin endpoint)
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services/admin"],
  });

  // Sort services alphabetically by name
  const sortedServices = [...services].sort((a, b) => 
    a.name.localeCompare(b.name)
  );

  // Form for adding/editing services
  const form = useForm<InsertService>({
    resolver: zodResolver(insertServiceSchema),
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
    mutationFn: async (data: InsertService) => {
      return await apiRequest("POST", "/api/services", data);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      // Show the plaintext secret (only time it's available)
      if (response.plaintextSecret) {
        setNewSecret(response.plaintextSecret);
        setSecretServiceName(response.name);
      }
      
      toast({
        title: "Service created",
        description: "The service has been added successfully. Copy the secret now!",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: InsertService }) => {
      return await apiRequest("PATCH", `/api/services/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service updated",
        description: "The service has been updated successfully",
      });
      setEditingService(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Service deleted",
        description: "The service has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete service",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertService) => {
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

  const handleEdit = (service: Service) => {
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
    if (confirm("Are you sure you want to delete this service?")) {
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

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.Globe;
    return IconComponent;
  };

  const copySecret = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret);
      toast({
        title: "✅ Secret copied!",
        description: "Service secret copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy secret to clipboard",
        variant: "destructive",
      });
    }
  };

  // Auto-copy secret when dialog opens
  useEffect(() => {
    if (newSecret) {
      copySecret(newSecret);
    }
  }, [newSecret]);

  const rotateSecretMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/services/${id}/rotate-secret`);
    },
    onSuccess: (response: any, serviceId: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/services/admin"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      // Find the service name
      const service = sortedServices.find(s => s.id === serviceId);
      
      // Show the new plaintext secret (only time it's available)
      if (response.plaintextSecret) {
        setNewSecret(response.plaintextSecret);
        setSecretServiceName(service?.name || "Service");
      }
      
      toast({
        title: "Secret rotated",
        description: "New secret generated. Copy it now!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to rotate secret",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRotateSecret = (id: string, name: string) => {
    if (confirm(`Are you sure you want to rotate the secret for "${name}"? The old secret will stop working immediately.`)) {
      rotateSecretMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <Dialog open={isAddDialogOpen || !!editingService} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-service">
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                <DialogDescription>
                  Configure a service card to display on the services page
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
                            placeholder="My SaaS App"
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
                            placeholder="Brief description of the service"
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
                            placeholder="https://example.com"
                            {...field}
                            data-testid="input-service-url"
                          />
                        </FormControl>
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
                            placeholder="https://example.com/dashboard (defaults to Service URL)"
                            {...field}
                            data-testid="input-redirect-url"
                          />
                        </FormControl>
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-service-icon">
                              <SelectValue placeholder="Select an icon" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ICON_OPTIONS.map((iconName) => {
                              const Icon = getIcon(iconName);
                              return (
                                <SelectItem key={iconName} value={iconName}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    <span>{iconName}</span>
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
                            placeholder="#FF5733 or hsl(9, 75%, 61%)"
                            {...field}
                            data-testid="input-service-color"
                          />
                        </FormControl>
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
                      data-testid="button-submit-service"
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
        <Card>
          <CardHeader>
            <CardTitle>Configured Services</CardTitle>
            <CardDescription>
              Manage service cards that appear to authenticated users. Each service has a secret for widget authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12">
                <Settings2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-medium text-foreground mb-1">No services configured</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Get started by adding your first service card
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-first-service">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Icon</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="font-semibold">URL</TableHead>
                      <TableHead className="font-semibold">Secret</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedServices.map((service) => {
                      const Icon = getIcon(service.icon);
                      return (
                        <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                          <TableCell>
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: service.color || "hsl(var(--primary))",
                                color: "white",
                              }}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {service.description}
                          </TableCell>
                          <TableCell>
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                              data-testid={`link-service-${service.id}`}
                            >
                              Visit
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </TableCell>
                          <TableCell>
                            {service.secretPreview ? (
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono" data-testid={`text-secret-${service.id}`}>
                                  {service.secretPreview}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    if (service.secretPreview) {
                                      navigator.clipboard.writeText(service.secretPreview);
                                      setCopiedSecret(service.id);
                                      toast({
                                        title: "Copied!",
                                        description: "Secret preview copied to clipboard",
                                      });
                                      setTimeout(() => setCopiedSecret(null), 2000);
                                    }
                                  }}
                                  data-testid={`button-copy-secret-${service.id}`}
                                >
                                  {copiedSecret === service.id ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground" data-testid={`text-secret-status-${service.id}`}>
                                No secret
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRotateSecret(service.id, service.name)}
                                disabled={rotateSecretMutation.isPending}
                                data-testid={`button-rotate-${service.id}`}
                                title="Generate new secret"
                              >
                                <Icons.RotateCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(service)}
                                data-testid={`button-edit-${service.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(service.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`button-delete-${service.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
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

        {/* Secret Display Dialog - Only shows once when secret is created/rotated */}
        <Dialog open={!!newSecret} onOpenChange={(open) => !open && setNewSecret(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-destructive text-xl">⚠️ Copy This Secret Now</DialogTitle>
              <DialogDescription className="text-base">
                This is the <strong>ONLY TIME</strong> you'll see this secret for <strong>{secretServiceName}</strong>.
                <br />
                <span className="text-green-600 dark:text-green-400 font-medium">✓ Already copied to clipboard!</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-primary/10 border-2 border-primary p-4 rounded-lg">
                <p className="text-xs font-semibold text-primary mb-2">Service Secret (Click to Select All)</p>
                <code 
                  className="text-base font-mono break-all select-all block p-2 bg-background rounded cursor-pointer hover-elevate" 
                  data-testid="text-new-secret"
                  onClick={() => {
                    const selection = window.getSelection();
                    const range = document.createRange();
                    range.selectNodeContents(document.querySelector('[data-testid="text-new-secret"]')!);
                    selection?.removeAllRanges();
                    selection?.addRange(range);
                  }}
                >
                  {newSecret}
                </code>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Security Note:</strong> This secret is stored as a bcrypt hash (like passwords). 
                  Once you close this dialog, it cannot be retrieved. Store it securely in your password manager or environment variables.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copySecret(newSecret!)}
                  className="flex-1"
                  size="lg"
                  data-testid="button-copy-new-secret"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewSecret(null)}
                  size="lg"
                  data-testid="button-close-secret-dialog"
                >
                  I've Saved It
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
