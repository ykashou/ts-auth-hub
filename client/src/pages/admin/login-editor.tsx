import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Save, RotateCcw, Globe, GripVertical, Undo2, Redo2, Monitor, Smartphone, Tablet, Upload, Check, X, Palette, Settings, Shield, Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { HexColorPicker } from "react-colorful";
import { getUserRole } from "@/lib/auth";
import type { GlobalService } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/Navbar";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface LoginConfig {
  id: string;
  serviceId: string | null;
  title: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultMethod: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthMethod {
  id: string;
  loginConfigId: string;
  authMethodId: string;
  enabled: boolean;
  showComingSoonBadge: boolean;
  buttonText: string | null;
  buttonVariant: string | null;
  helpText: string | null;
  displayOrder: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  implemented: boolean;
  defaultButtonText: string;
  defaultButtonVariant: string;
  defaultHelpText: string | null;
}

interface LoginConfigResponse {
  config: LoginConfig;
  methods: AuthMethod[];
}

// Live Preview Component that renders the actual login page
function LoginPagePreview({ configId, refreshTrigger }: { configId: string | null; refreshTrigger: number }) {
  const serviceIdParam = "550e8400-e29b-41d4-a716-446655440000"; // AuthHub service ID
  
  const { data: loginConfigData, isLoading, isError } = useQuery<LoginConfigResponse>({
    queryKey: ["/api/login-config", serviceIdParam, refreshTrigger],
    queryFn: async () => {
      const response = await fetch(`/api/login-config?serviceId=${serviceIdParam}`);
      if (!response.ok) {
        throw new Error('Failed to fetch login configuration');
      }
      return response.json();
    },
    enabled: true,
  });

  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !loginConfigData) {
    return (
      <div className="h-full flex items-center justify-center bg-background p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Error</CardTitle>
            <CardDescription>Failed to load login configuration. Please try again later.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { config, methods } = loginConfigData;
  const enabledMethods = methods.filter(m => m.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
  const primaryMethods = enabledMethods.filter(m => m.authMethodId === "email" || m.authMethodId === "uuid");
  const alternativeMethods = enabledMethods.filter(m => m.authMethodId !== "email" && m.authMethodId !== "uuid");
  const defaultMethod = config.defaultMethod || primaryMethods[0]?.authMethodId || "uuid";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md" data-testid="preview-card">
        <CardHeader className="text-center space-y-2">
          {config.logoUrl ? (
            <img
              src={config.logoUrl}
              alt="Logo"
              className="mx-auto w-12 h-12 object-contain rounded-lg"
              data-testid="preview-logo"
            />
          ) : (
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto" data-testid="preview-logo-default">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          )}
          <CardTitle className="text-2xl font-semibold" data-testid="preview-title">{config.title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground" data-testid="preview-description">{config.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Method Tabs */}
          {primaryMethods.length > 1 && (
            <>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${primaryMethods.length}, 1fr)` }}>
                {primaryMethods.map((method) => {
                  const Icon = getIcon(method.icon);
                  return (
                    <Button
                      key={method.authMethodId}
                      type="button"
                      variant={defaultMethod === method.authMethodId ? "default" : "outline"}
                      className="w-full pointer-events-none"
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {method.name}
                    </Button>
                  );
                })}
              </div>
              {primaryMethods.find(m => m.authMethodId === defaultMethod)?.helpText && (
                <p className="text-xs text-center text-muted-foreground">
                  {primaryMethods.find(m => m.authMethodId === defaultMethod)?.helpText ||
                   primaryMethods.find(m => m.authMethodId === defaultMethod)?.defaultHelpText}
                </p>
              )}
            </>
          )}

          <Separator />

          {/* Active Method Form - Non-interactive Preview */}
          {defaultMethod === "uuid" && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-3">GENERATE NEW ACCOUNT ID</p>
                <Button type="button" className="w-full h-11 pointer-events-none" variant="default">
                  Generate New Account ID
                </Button>
              </div>
              <Separator />
              <p className="text-xs text-center text-muted-foreground">OR USE EXISTING ACCOUNT ID</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Account ID (Optional)</Label>
                  <Input placeholder="Enter your existing account ID" className="h-11 mt-1.5 pointer-events-none" readOnly />
                </div>
                <Button type="button" variant="outline" className="w-full h-11 pointer-events-none">
                  Log In with Existing ID
                </Button>
              </div>
            </div>
          )}

          {defaultMethod === "email" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <Input type="email" placeholder="Enter your email" className="h-11 mt-1.5 pointer-events-none" readOnly />
              </div>
              <div>
                <Label className="text-sm font-medium">Password</Label>
                <Input type="password" placeholder="Enter your password" className="h-11 mt-1.5 pointer-events-none" readOnly />
              </div>
              <Button type="button" className="w-full h-11 pointer-events-none">
                Log In
              </Button>
            </div>
          )}

          {alternativeMethods.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <p className="text-xs text-center text-muted-foreground">OR AUTHENTICATE WITH</p>
                <div className="grid grid-cols-1 gap-2">
                  {alternativeMethods.map((method) => {
                    const Icon = getIcon(method.icon);
                    return (
                      <Button
                        key={method.authMethodId}
                        type="button"
                        variant={method.buttonVariant as any || method.defaultButtonVariant as any}
                        className="w-full justify-start relative pointer-events-none"
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {method.buttonText || method.defaultButtonText}
                        {method.showComingSoonBadge && (
                          <Badge variant="secondary" className="absolute right-2 text-xs">
                            Coming Soon
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SortableMethodItemProps {
  method: AuthMethod;
  onToggle: () => void;
  onUpdate: (updates: Partial<AuthMethod>) => void;
}

function SortableMethodItem({ method, onToggle, onUpdate }: SortableMethodItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: method.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  const Icon = getIcon(method.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-card border rounded-md"
      data-testid={`method-item-${method.authMethodId}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{method.name}</p>
        <p className="text-xs text-muted-foreground truncate">{method.description}</p>
      </div>
      <Switch checked={method.enabled} onCheckedChange={onToggle} data-testid={`switch-${method.authMethodId}`} />
    </div>
  );
}

export default function LoginEditor() {
  const [location, setLocation] = useLocation();
  const userRole = getUserRole();
  const { toast } = useToast();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    logoUrl: null as string | null,
    defaultMethod: "uuid",
  });

  const [methodsState, setMethodsState] = useState<AuthMethod[]>([]);
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalMethodsState, setOriginalMethodsState] = useState<AuthMethod[]>([]);

  // Redirect if not admin
  useEffect(() => {
    if (userRole !== 'admin') {
      toast({
        title: "Access denied",
        description: "Only administrators can access the login editor",
        variant: "destructive",
      });
      setLocation("/dashboard");
    }
  }, [userRole, toast, setLocation]);

  // Fetch services for selection
  const { data: services } = useQuery<GlobalService[]>({
    queryKey: ["/api/services"],
    enabled: userRole === 'admin',
  });

  // Fetch login configuration
  const { data: loginConfigData, isLoading, refetch } = useQuery<LoginConfigResponse>({
    queryKey: selectedServiceId ? ["/api/admin/login-config", selectedServiceId] : ["/api/admin/login-configs"],
    enabled: userRole === 'admin',
  });

  // Initialize form data when config loads
  useEffect(() => {
    if (loginConfigData) {
      const config = Array.isArray(loginConfigData) ? loginConfigData[0] : loginConfigData.config;
      const methods = Array.isArray(loginConfigData) ? [] : loginConfigData.methods;
      
      if (config) {
        const newFormData = {
          title: config.title,
          description: config.description,
          logoUrl: config.logoUrl,
          defaultMethod: config.defaultMethod,
        };
        setFormData(newFormData);
        setOriginalFormData(newFormData);
      }
      
      if (methods && methods.length > 0) {
        setMethodsState(methods);
        setOriginalMethodsState(methods);
      }
    }
  }, [loginConfigData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!loginConfigData) throw new Error("No config data available");
      
      const config = Array.isArray(loginConfigData) ? loginConfigData[0] : loginConfigData.config;
      
      // Update config
      await apiRequest("PATCH", `/api/admin/login-config/${config.id}`, formData);
      
      // Update methods order
      const orderUpdates = methodsState.map((method, index) => ({
        id: method.id,
        displayOrder: index,
        enabled: method.enabled,
      }));
      
      await apiRequest("PUT", "/api/admin/service-auth-methods/order", {
        updates: orderUpdates,
      });
    },
    onMutate: () => {
      setAutoSaveStatus("saving");
    },
    onSuccess: () => {
      setAutoSaveStatus("saved");
      setOriginalFormData(formData);
      setOriginalMethodsState(methodsState);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/login-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-configs"] });
      
      // Trigger preview refresh
      setRefreshTrigger(prev => prev + 1);
      
      toast({
        title: "Saved",
        description: "Login page configuration updated successfully",
      });
      
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    },
    onError: (error: any) => {
      setAutoSaveStatus("idle");
      toast({
        title: "Error",
        description: error.message || "Failed to save configuration",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleReset = () => {
    setFormData(originalFormData);
    setMethodsState(originalMethodsState);
    toast({
      title: "Reset",
      description: "Changes discarded",
    });
  };

  const isDirty = 
    JSON.stringify(formData) !== JSON.stringify(originalFormData) ||
    JSON.stringify(methodsState) !== JSON.stringify(originalMethodsState);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMethodsState((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleMethod = (methodId: string) => {
    setMethodsState(prev =>
      prev.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m)
    );
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (userRole !== 'admin') {
    return null;
  }

  const config = loginConfigData && !Array.isArray(loginConfigData) ? loginConfigData.config : null;

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      
      {/* Full-screen CMS Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor Controls */}
        <div className="w-96 border-r bg-muted/30 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Login Page Editor</h2>
              <div className="flex items-center gap-2">
                {autoSaveStatus === "saving" && (
                  <Badge variant="secondary" className="gap-1" data-testid="badge-saving">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </Badge>
                )}
                {autoSaveStatus === "saved" && (
                  <Badge variant="default" className="gap-1" data-testid="badge-saved">
                    <Check className="h-3 w-3" />
                    Saved
                  </Badge>
                )}
              </div>
            </div>

            {/* Service Selector */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Service</Label>
              <Select value={selectedServiceId || "default"} onValueChange={(v) => setSelectedServiceId(v === "default" ? null : v)}>
                <SelectTrigger data-testid="select-service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Default Configuration
                    </div>
                  </SelectItem>
                  {services?.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSave}
                disabled={!isDirty || saveMutation.isPending}
                size="sm"
                className="flex-1"
                data-testid="button-save"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={handleReset}
                disabled={!isDirty}
                variant="outline"
                size="sm"
                data-testid="button-reset"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Editor Tabs */}
          <ScrollArea className="flex-1">
            <Tabs defaultValue="branding" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger value="branding" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary" data-testid="tab-branding">
                  <Palette className="h-4 w-4 mr-2" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="methods" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary" data-testid="tab-methods">
                  <Settings className="h-4 w-4 mr-2" />
                  Methods
                </TabsTrigger>
              </TabsList>

              <TabsContent value="branding" className="p-4 space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Logo"
                        className="w-16 h-16 object-contain rounded-lg border cursor-pointer hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="image-logo"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                        onClick={() => fileInputRef.current?.click()}
                        data-testid="div-logo-default"
                      >
                        <Shield className="w-8 h-8 text-primary-foreground" />
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, logoUrl: null }))}
                        data-testid="button-remove-logo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      data-testid="input-logo-file"
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Welcome to AuthHub"
                    data-testid="input-title"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Choose your preferred authentication method"
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                {/* Default Method */}
                <div className="space-y-2">
                  <Label>Default Method</Label>
                  <Select value={formData.defaultMethod} onValueChange={(v) => setFormData(prev => ({ ...prev, defaultMethod: v }))}>
                    <SelectTrigger data-testid="select-default-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {methodsState.filter(m => m.enabled && (m.authMethodId === "email" || m.authMethodId === "uuid")).map(method => (
                        <SelectItem key={method.authMethodId} value={method.authMethodId}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="methods" className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Authentication Methods</Label>
                  <p className="text-xs text-muted-foreground">
                    Drag to reorder, toggle to enable/disable methods
                  </p>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={methodsState.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {methodsState.map((method) => (
                        <SortableMethodItem
                          key={method.id}
                          method={method}
                          onToggle={() => toggleMethod(method.id)}
                          onUpdate={(updates) => {
                            setMethodsState(prev =>
                              prev.map(m => m.id === method.id ? { ...m, ...updates } : m)
                            );
                          }}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 bg-muted/10 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <LoginPagePreview configId={config?.id || null} refreshTrigger={refreshTrigger} />
          )}
        </div>
      </div>
    </div>
  );
}
