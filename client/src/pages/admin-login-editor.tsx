import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Save, Eye, Palette, Settings2, ArrowUpDown, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import type { Service } from "@shared/schema";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types for login configuration
type AuthMethod = {
  id: string;
  name: string;
  description: string;
  icon: string;
  implemented: boolean;
  defaultButtonText: string;
};

type ServiceAuthMethod = {
  id: string;
  authMethodId: string;
  enabled: boolean;
  showComingSoonBadge: boolean;
  buttonText: string | null;
  helpText: string | null;
  displayOrder: number;
  authMethod: AuthMethod;
};

type LoginConfig = {
  id: string;
  serviceId: string;
  title: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultMethod: string;
  methods: ServiceAuthMethod[];
};

// Form schema for branding
const brandingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  primaryColor: z.string().optional(),
  defaultMethod: z.string().min(1, "Default method is required"),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

// Sortable auth method item component
function SortableAuthMethodItem({ 
  method, 
  onToggle, 
  onToggleComingSoon, 
  onUpdateText 
}: { 
  method: ServiceAuthMethod;
  onToggle: (id: string, enabled: boolean) => void;
  onToggleComingSoon: (id: string, show: boolean) => void;
  onUpdateText: (id: string, field: 'buttonText' | 'helpText', value: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border rounded-md p-4"
      data-testid={`auth-method-${method.authMethodId}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
            data-testid={`drag-handle-${method.authMethodId}`}
          >
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{method.authMethod.name}</span>
              {!method.authMethod.implemented && (
                <Badge variant="secondary" className="text-xs">Not Implemented</Badge>
              )}
              {method.showComingSoonBadge && method.enabled && (
                <Badge variant="outline" className="text-xs">Coming Soon</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {method.authMethod.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {method.enabled && method.authMethod.implemented && (
            <Switch
              checked={method.showComingSoonBadge}
              onCheckedChange={(checked) => onToggleComingSoon(method.id, checked)}
              data-testid={`toggle-coming-soon-${method.authMethodId}`}
            />
          )}
          <Switch
            checked={method.enabled}
            onCheckedChange={(checked) => onToggle(method.id, checked)}
            data-testid={`toggle-enabled-${method.authMethodId}`}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid={`button-expand-${method.authMethodId}`}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Button Text</label>
            <Input
              placeholder={method.authMethod.defaultButtonText}
              value={method.buttonText || ""}
              onChange={(e) => onUpdateText(method.id, 'buttonText', e.target.value)}
              data-testid={`input-button-text-${method.authMethodId}`}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Help Text (Optional)</label>
            <Input
              placeholder="Additional help text"
              value={method.helpText || ""}
              onChange={(e) => onUpdateText(method.id, 'helpText', e.target.value)}
              data-testid={`input-help-text-${method.authMethodId}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLoginEditor() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [authMethods, setAuthMethods] = useState<ServiceAuthMethod[]>([]);

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

  // Fetch all services
  const { data: services = [], isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Fetch login config for selected service
  const { data: loginConfig, isLoading: isLoadingConfig, refetch: refetchConfig } = useQuery<LoginConfig>({
    queryKey: ["/api/services", selectedServiceId, "login-config"],
    enabled: !!selectedServiceId,
  });

  // Initialize auth methods when config loads
  useEffect(() => {
    if (loginConfig?.methods) {
      setAuthMethods([...loginConfig.methods].sort((a, b) => a.displayOrder - b.displayOrder));
    }
  }, [loginConfig]);

  // Find system service
  const systemService = services.find(s => (s as any).isSystemService);

  // Form for branding configuration
  const form = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    values: loginConfig ? {
      title: loginConfig.title,
      description: loginConfig.description,
      logoUrl: loginConfig.logoUrl || "",
      primaryColor: loginConfig.primaryColor || "",
      defaultMethod: loginConfig.defaultMethod,
    } : undefined,
  });

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (data: BrandingFormData) => {
      return await apiRequest("PATCH", `/api/services/${selectedServiceId}/login-config`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedServiceId, "login-config"] });
      toast({
        title: "Branding updated",
        description: "Login page branding has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update auth methods mutation
  const updateMethodsMutation = useMutation({
    mutationFn: async (methods: ServiceAuthMethod[]) => {
      return await apiRequest("PATCH", `/api/services/${selectedServiceId}/login-config/methods`, {
        methods: methods.map((m, index) => ({
          id: m.id,
          enabled: m.enabled,
          showComingSoonBadge: m.showComingSoonBadge,
          buttonText: m.buttonText,
          helpText: m.helpText,
          displayOrder: index,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services", selectedServiceId, "login-config"] });
      toast({
        title: "Auth methods updated",
        description: "Login methods have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAuthMethods((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Toggle auth method enabled
  const handleToggleEnabled = (id: string, enabled: boolean) => {
    setAuthMethods(prev => prev.map(m => m.id === id ? { ...m, enabled } : m));
  };

  // Toggle coming soon badge
  const handleToggleComingSoon = (id: string, show: boolean) => {
    setAuthMethods(prev => prev.map(m => m.id === id ? { ...m, showComingSoonBadge: show } : m));
  };

  // Update method text
  const handleUpdateText = (id: string, field: 'buttonText' | 'helpText', value: string) => {
    setAuthMethods(prev => prev.map(m => m.id === id ? { ...m, [field]: value || null } : m));
  };

  // Save all auth method changes
  const handleSaveAuthMethods = () => {
    updateMethodsMutation.mutate(authMethods);
  };

  // Handle branding form submit
  const onSubmitBranding = (data: BrandingFormData) => {
    updateBrandingMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Login Page Editor</h1>
          <p className="text-muted-foreground">
            Customize the login experience for each service with branding, auth methods, and configurations.
          </p>
        </div>

        {/* Service Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Select Service
            </CardTitle>
            <CardDescription>
              Choose which service's login page you want to configure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingServices ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading services...
              </div>
            ) : (
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger data-testid="select-service">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id} data-testid={`service-option-${service.id}`}>
                      <div className="flex items-center gap-2">
                        {service.name}
                        {(service as any).isSystemService && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Lock className="w-3 h-3" />
                            System
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Configuration Section */}
        {selectedServiceId && (
          <>
            {isLoadingConfig ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-muted-foreground" />
              </div>
            ) : loginConfig ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Branding */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Branding
                      </CardTitle>
                      <CardDescription>
                        Customize the appearance and messaging of the login page
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitBranding)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Page Title</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Welcome to AuthHub" data-testid="input-title" />
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
                                    {...field} 
                                    placeholder="Choose your preferred authentication method"
                                    rows={3}
                                    data-testid="input-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Logo URL (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="https://example.com/logo.png" data-testid="input-logo-url" />
                                </FormControl>
                                <FormDescription>URL to your service logo</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="primaryColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Primary Color (Optional)</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="#4C51BF" data-testid="input-primary-color" />
                                </FormControl>
                                <FormDescription>Hex color code for accents</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="defaultMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Auth Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-default-method">
                                      <SelectValue placeholder="Select default method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {authMethods
                                      .filter(m => m.enabled && m.authMethod.implemented)
                                      .map((method) => (
                                        <SelectItem key={method.authMethodId} value={method.authMethodId}>
                                          {method.authMethod.name}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Which method is selected by default
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button 
                            type="submit" 
                            disabled={updateBrandingMutation.isPending}
                            className="w-full"
                            data-testid="button-save-branding"
                          >
                            {updateBrandingMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Branding
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Preview
                      </CardTitle>
                      <CardDescription>
                        See your login page at runtime
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        className="w-full"
                        asChild
                        data-testid="button-preview"
                      >
                        <a
                          href={`/login?service_id=${selectedServiceId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Open Login Page
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Auth Methods */}
                <div>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>Authentication Methods</CardTitle>
                          <CardDescription className="mt-1.5">
                            Drag to reorder, toggle to enable/disable
                          </CardDescription>
                        </div>
                        <Button
                          onClick={handleSaveAuthMethods}
                          disabled={updateMethodsMutation.isPending}
                          data-testid="button-save-methods"
                        >
                          {updateMethodsMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Order
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={authMethods.map(m => m.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3">
                            {authMethods.map((method) => (
                              <SortableAuthMethodItem
                                key={method.id}
                                method={method}
                                onToggle={handleToggleEnabled}
                                onToggleComingSoon={handleToggleComingSoon}
                                onUpdateText={handleUpdateText}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-20 text-center">
                  <p className="text-muted-foreground">
                    No login configuration found for this service.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
