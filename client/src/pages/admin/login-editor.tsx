import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
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
import { Loader2, Save, RotateCcw, Globe, GripVertical, Undo2, Redo2, Monitor, Smartphone, Tablet, Upload, Check, X, Palette, Settings, Shield, Mail, KeyRound, Eye, EyeOff, Plus } from "lucide-react";
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
  methodCategory: string;
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

// Live Preview Component that renders the actual login page with inline editing
function LoginPagePreview({ 
  configId, 
  refreshTrigger, 
  formData, 
  setFormData,
  onLogoUpload,
  methodsState,
  setMethodsState
}: { 
  configId: string | null; 
  refreshTrigger: number;
  formData: any;
  setFormData: (data: any) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  methodsState: AuthMethod[];
  setMethodsState: (methods: AuthMethod[] | ((prev: AuthMethod[]) => AuthMethod[])) => void;
}) {
  const serviceIdParam = "550e8400-e29b-41d4-a716-446655440000"; // AuthHub service ID
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Drag and drop sensors for method reordering
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleMethodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setMethodsState((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update displayOrder to match new positions for persistence
        return reordered.map((method, index) => ({
          ...method,
          displayOrder: index,
        }));
      });
    }
  };
  
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

  const { config } = loginConfigData;
  // Use methodsState from parent instead of fetched methods for real-time updates
  const enabledMethods = methodsState.filter(m => m.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
  const primaryMethods = enabledMethods.filter(m => m.methodCategory === "primary" || m.methodCategory === "secondary");
  const alternativeMethods = enabledMethods.filter(m => m.methodCategory === "alternative");
  const defaultMethod = formData.defaultMethod || primaryMethods[0]?.authMethodId || "uuid";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md relative" data-testid="preview-card">
        <CardHeader className="text-center space-y-2">
          {/* Editable Logo */}
          <div className="relative group mx-auto w-12 h-12">
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt="Logo"
                className="w-12 h-12 object-contain rounded-lg"
                data-testid="preview-logo"
              />
            ) : (
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center" data-testid="preview-logo-default">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={() => logoInputRef.current?.click()}
              data-testid="button-edit-logo"
            >
              <Upload className="h-3 w-3" />
            </Button>
            {formData.logoUrl && (
              <Button
                size="icon"
                variant="destructive"
                className="absolute -bottom-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                onClick={() => setFormData((prev: any) => ({ ...prev, logoUrl: null }))}
                data-testid="button-remove-logo-preview"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoUpload}
            />
          </div>

          {/* Editable Title */}
          <div className="relative group">
            <Input
              value={formData.title}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, title: e.target.value }))}
              className="text-2xl font-semibold text-center border-transparent hover:border-input focus:border-input transition-colors bg-transparent"
              data-testid="preview-title"
            />
          </div>

          {/* Editable Description */}
          <div className="relative group">
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
              className="text-sm text-center border-transparent hover:border-input focus:border-input transition-colors bg-transparent resize-none text-muted-foreground min-h-[40px]"
              rows={2}
              data-testid="preview-description"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Primary Method Tabs - Draggable */}
          {primaryMethods.length > 1 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleMethodDragEnd}
            >
              <SortableContext
                items={primaryMethods.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${primaryMethods.length}, 1fr)` }}>
                  {primaryMethods.map((method) => (
                    <SortableMethodButton
                      key={method.id}
                      method={method}
                      isDefault={defaultMethod === method.authMethodId}
                    />
                  ))}
                </div>
              </SortableContext>
              {primaryMethods.find(m => m.authMethodId === defaultMethod)?.helpText && (
                <p className="text-xs text-center text-muted-foreground">
                  {primaryMethods.find(m => m.authMethodId === defaultMethod)?.helpText ||
                   primaryMethods.find(m => m.authMethodId === defaultMethod)?.defaultHelpText}
                </p>
              )}
            </DndContext>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleMethodDragEnd}
                >
                  <SortableContext
                    items={alternativeMethods.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="grid grid-cols-1 gap-2">
                      {alternativeMethods.map((method) => (
                        <SortableAltMethodButton
                          key={method.id}
                          method={method}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Sortable Method Button for the Preview
interface SortableMethodButtonProps {
  method: AuthMethod;
  isDefault: boolean;
}

function SortableMethodButton({ method, isDefault }: SortableMethodButtonProps) {
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
    opacity: isDragging ? 0.6 : 1,
  };

  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  const Icon = getIcon(method.icon);

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Button
        type="button"
        variant={isDefault ? "default" : "outline"}
        className="w-full pointer-events-none"
        data-testid={`preview-method-${method.authMethodId}`}
      >
        <Icon className="w-4 h-4 mr-2" />
        {method.name}
      </Button>
      <div 
        {...attributes} 
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

// Sortable Alternative Method Button
interface SortableAltMethodButtonProps {
  method: AuthMethod;
}

function SortableAltMethodButton({ method }: SortableAltMethodButtonProps) {
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
    opacity: isDragging ? 0.6 : 1,
  };

  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  const Icon = getIcon(method.icon);

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Button
        type="button"
        variant={method.buttonVariant as any || method.defaultButtonVariant as any}
        className="w-full justify-start relative pointer-events-none"
        data-testid={`preview-alt-method-${method.authMethodId}`}
      >
        <Icon className="w-4 h-4 mr-2" />
        {method.buttonText || method.defaultButtonText}
        {method.showComingSoonBadge && (
          <Badge variant="secondary" className="absolute right-2 text-xs pointer-events-none">
            Coming Soon
          </Badge>
        )}
      </Button>
      <div 
        {...attributes} 
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

interface MethodToggleItemProps {
  method: AuthMethod;
  onToggle: () => void;
  onCategoryChange: (category: string) => void;
}

function MethodToggleItem({ method, onToggle, onCategoryChange }: MethodToggleItemProps) {
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
    opacity: isDragging ? 0.6 : 1,
  };

  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  const Icon = getIcon(method.icon);
  
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "primary":
        return <Badge variant="default" className="text-[9px] px-1 py-0">Primary</Badge>;
      case "secondary":
        return <Badge variant="secondary" className="text-[9px] px-1 py-0">Secondary</Badge>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-2 bg-card border rounded-md"
      data-testid={`method-item-${method.authMethodId}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-0.5">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="font-medium text-xs truncate leading-tight">{method.name}</p>
          {getCategoryBadge(method.methodCategory)}
        </div>
        <p className="text-[10px] text-muted-foreground truncate leading-tight mb-1">{method.description}</p>
        <Select
          value={method.methodCategory}
          onValueChange={onCategoryChange}
        >
          <SelectTrigger className="h-6 text-[10px] w-full" data-testid={`select-category-${method.authMethodId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="primary">Primary Method</SelectItem>
            <SelectItem value="secondary">Secondary Method</SelectItem>
            <SelectItem value="alternative">Alternative Method</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Switch checked={method.enabled} onCheckedChange={onToggle} data-testid={`switch-${method.authMethodId}`} />
    </div>
  );
}

export default function LoginEditor() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/admin/login-editor/:configId");
  const userRole = getUserRole();
  const { toast } = useToast();
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [configName, setConfigName] = useState("");

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

  // Get configId from URL params, or fetch all configs to get the first one
  const { data: allConfigs } = useQuery<any[]>({
    queryKey: ["/api/admin/login-configs"],
    enabled: userRole === 'admin' && !params?.configId,
  });

  // Use configId from URL params if available, otherwise use first config from list
  const configId = params?.configId || allConfigs?.[0]?.id;
  
  const { data: loginConfigData, isLoading, refetch } = useQuery<LoginConfigResponse>({
    queryKey: ["/api/admin/login-config", configId],
    enabled: userRole === 'admin' && !!configId,
  });

  // Initialize form data when config loads
  useEffect(() => {
    if (loginConfigData) {
      const config = loginConfigData.config;
      const methods = loginConfigData.methods || [];
      
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
      
      if (methods.length > 0) {
        setMethodsState(methods);
        setOriginalMethodsState(methods);
      }
    }
  }, [loginConfigData]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isCreatingNew) {
        // Create new configuration
        if (!configName.trim()) {
          throw new Error("Configuration name is required");
        }
        
        const newConfig = await apiRequest("POST", "/api/admin/login-config", {
          serviceId: "550e8400-e29b-41d4-a716-446655440000", // AuthHub service ID
          title: formData.title,
          description: formData.description,
          logoUrl: formData.logoUrl,
          defaultMethod: formData.defaultMethod,
        });
        
        // Methods will be auto-created by the backend
        return newConfig;
      } else {
        // Update existing configuration
        if (!loginConfigData) throw new Error("No config data available");
        
        const config = loginConfigData.config;
        
        // Update config
        await apiRequest("PATCH", `/api/admin/login-config/${config.id}`, formData);
        
        // Update methods order and categories
        const orderUpdates = methodsState.map((method, index) => ({
          id: method.id,
          displayOrder: index,
          enabled: method.enabled,
          methodCategory: method.methodCategory,
        }));
        
        await apiRequest("PUT", "/api/admin/service-auth-methods/order", {
          updates: orderUpdates,
        });
      }
    },
    onMutate: () => {
      setAutoSaveStatus("saving");
    },
    onSuccess: (data) => {
      setAutoSaveStatus("saved");
      setOriginalFormData(formData);
      setOriginalMethodsState(methodsState);
      
      // Invalidate all related queries (match the actual query keys)
      queryClient.invalidateQueries({ queryKey: ["/api/login-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config", configId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-configs"] });
      
      // Trigger preview refresh
      setRefreshTrigger(prev => prev + 1);
      
      if (isCreatingNew) {
        toast({
          title: "Created",
          description: "New login page configuration created successfully",
        });
        // Navigate to the new config
        setLocation(`/admin/login-editor/${data.id}`);
        setIsCreatingNew(false);
        setConfigName("");
      } else {
        toast({
          title: "Saved",
          description: "Login page configuration updated successfully",
        });
      }
      
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
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update displayOrder to match new positions
        return reordered.map((method, index) => ({
          ...method,
          displayOrder: index,
        }));
      });
    }
  };

  const toggleMethod = (methodId: string) => {
    setMethodsState(prev =>
      prev.map(m => m.id === methodId ? { ...m, enabled: !m.enabled } : m)
    );
  };

  const changeMethodCategory = (methodId: string, category: string) => {
    setMethodsState(prev =>
      prev.map(m => m.id === methodId ? { ...m, methodCategory: category } : m)
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

  const config = loginConfigData?.config || null;

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      
      {/* Full-screen CMS Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Editor Controls */}
        <div className="w-96 border-r bg-muted/30 flex flex-col">
          {/* Header */}
          <div className="p-3 border-b bg-card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Login Page Editor</h2>
              <div className="flex items-center gap-1.5">
                {autoSaveStatus === "saving" && (
                  <Badge variant="secondary" className="gap-1 text-xs" data-testid="badge-saving">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Saving...
                  </Badge>
                )}
                {autoSaveStatus === "saved" && (
                  <Badge variant="default" className="gap-1 text-xs" data-testid="badge-saved">
                    <Check className="h-2.5 w-2.5" />
                    Saved
                  </Badge>
                )}
              </div>
            </div>

            {/* Configuration Selector */}
            <div className="space-y-2 mb-2">
              <Label className="text-xs">Configuration</Label>
              {isCreatingNew ? (
                <div className="space-y-2">
                  <Input
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Enter configuration name"
                    className="h-8 text-sm"
                    data-testid="input-config-name"
                  />
                  <Button
                    onClick={() => {
                      setIsCreatingNew(false);
                      setConfigName("");
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    data-testid="button-cancel-new"
                  >
                    Cancel New Configuration
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={configId || ""}
                    onValueChange={(value) => setLocation(`/admin/login-editor/${value}`)}
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm" data-testid="select-config">
                      <SelectValue placeholder="Select configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {allConfigs?.map((cfg) => (
                        <SelectItem key={cfg.id} value={cfg.id}>
                          {cfg.title || "Untitled"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setIsCreatingNew(true);
                      setConfigName("New Configuration");
                      setFormData({
                        title: "New Login Page",
                        description: "Sign in to continue",
                        logoUrl: null,
                        defaultMethod: "uuid",
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="h-8"
                    data-testid="button-new-config"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={(!isDirty && !isCreatingNew) || saveMutation.isPending || (isCreatingNew && !configName.trim())}
                size="sm"
                className="flex-1"
                data-testid="button-save"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isCreatingNew ? "Create Configuration" : "Save Changes"}
              </Button>
              {!isCreatingNew && (
                <Button
                  onClick={handleReset}
                  disabled={!isDirty}
                  variant="outline"
                  size="sm"
                  data-testid="button-reset"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Editor Tabs */}
          <ScrollArea className="flex-1">
            <div className="w-full">
              <div className="border-b bg-transparent p-0">
                <div className="px-3 py-1.5 border-b-2 border-primary">
                  <div className="flex items-center gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    <span className="font-medium text-sm">Authentication Methods</span>
                  </div>
                </div>
              </div>

              <div className="p-3 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Enable/Disable Methods</Label>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Toggle methods on/off. Drag to reorder.
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
                    <div className="space-y-1.5">
                      {methodsState.map((method) => (
                        <MethodToggleItem
                          key={method.id}
                          method={method}
                          onToggle={() => toggleMethod(method.id)}
                          onCategoryChange={(category) => changeMethodCategory(method.id, category)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="flex-1 bg-muted/10 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <LoginPagePreview 
              configId={config?.id || null} 
              refreshTrigger={refreshTrigger}
              formData={formData}
              setFormData={setFormData}
              onLogoUpload={handleLogoUpload}
              methodsState={methodsState}
              setMethodsState={setMethodsState}
            />
          )}
        </div>
      </div>
    </div>
  );
}
