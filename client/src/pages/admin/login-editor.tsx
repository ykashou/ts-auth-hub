import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RotateCcw, Globe, GripVertical } from "lucide-react";
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

interface SortableMethodItemProps {
  method: AuthMethod;
  onToggle: (checked: boolean) => void;
}

function SortableMethodItem({ method, onToggle }: SortableMethodItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-4 border rounded-md bg-card"
      data-testid={`method-card-${method.authMethodId}`}
    >
      <button
        className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
        data-testid={`drag-handle-${method.authMethodId}`}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{method.name}</h4>
          {!method.implemented && (
            <Badge variant="secondary" data-testid={`badge-coming-soon-${method.authMethodId}`}>
              Coming Soon
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {method.description}
        </p>
      </div>
      <Switch
        checked={method.enabled}
        onCheckedChange={onToggle}
        disabled={!method.implemented}
        data-testid={`switch-enable-${method.authMethodId}`}
      />
    </div>
  );
}

export default function LoginEditorPage() {
  const [, setLocation] = useLocation();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("branding");
  const { toast } = useToast();
  
  // Check admin authorization
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  
  // Redirect non-admins to dashboard
  useEffect(() => {
    if (!isAdmin) {
      setLocation("/dashboard");
    }
  }, [isAdmin, setLocation]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch global services
  const { data: globalServices, isLoading: servicesLoading } = useQuery<GlobalService[]>({
    queryKey: ["/api/admin/global-services"],
  });

  // Fetch login configs
  const { data: loginConfigs, isLoading: configsLoading } = useQuery<LoginConfig[]>({
    queryKey: ["/api/admin/login-configs"],
  });

  // Fetch selected config with methods
  const configId = loginConfigs?.find(c => 
    selectedServiceId === null ? c.serviceId === null : c.serviceId === selectedServiceId
  )?.id;

  const { data: configData, isLoading: configDataLoading } = useQuery<LoginConfigResponse>({
    queryKey: ["/api/admin/login-config", configId],
    enabled: !!configId,
  });

  // Local state for form (will be synced with configData)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    logoUrl: "",
    defaultMethod: "uuid",
  });

  const [methodsState, setMethodsState] = useState<AuthMethod[]>([]);

  // Original data for dirty state tracking
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalMethodsState, setOriginalMethodsState] = useState<AuthMethod[]>([]);

  // Sync form data when config loads
  useEffect(() => {
    if (configData) {
      const newFormData = {
        title: configData.config.title,
        description: configData.config.description,
        logoUrl: configData.config.logoUrl || "",
        defaultMethod: configData.config.defaultMethod,
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData);
      
      // Sort methods by displayOrder
      const sortedMethods = [...configData.methods].sort((a, b) => a.displayOrder - b.displayOrder);
      setMethodsState(sortedMethods);
      setOriginalMethodsState(sortedMethods);
    }
  }, [configData]);

  const isLoading = servicesLoading || configsLoading || configDataLoading;

  // Check if data has changed (dirty state)
  const isDirty = (() => {
    if (!configData) return false;
    
    // Check branding changes
    const brandingChanged = 
      formData.title !== originalFormData.title ||
      formData.description !== originalFormData.description ||
      formData.logoUrl !== originalFormData.logoUrl ||
      formData.defaultMethod !== originalFormData.defaultMethod;
    
    // Check methods changes (enabled/disabled or order)
    const methodsChanged = JSON.stringify(methodsState) !== JSON.stringify(originalMethodsState);
    
    return brandingChanged || methodsChanged;
  })();

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!configData) throw new Error("No config data");
      
      // Update branding
      await apiRequest(
        "PATCH",
        `/api/admin/login-config/${configData.config.id}`,
        {
          title: formData.title,
          description: formData.description,
          logoUrl: formData.logoUrl || null,
          defaultMethod: formData.defaultMethod,
        }
      );

      // Update methods (enabled/disabled and order)
      for (const method of methodsState) {
        const original = originalMethodsState.find(m => m.id === method.id);
        if (!original || 
            method.enabled !== original.enabled || 
            method.displayOrder !== original.displayOrder) {
          await apiRequest(
            "PATCH",
            `/api/admin/service-auth-method/${method.id}`,
            {
              enabled: method.enabled,
              displayOrder: method.displayOrder,
            }
          );
        }
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config", configId] });
      queryClient.invalidateQueries({ queryKey: ["/api/login-config"] });
      
      toast({
        title: "Changes saved",
        description: "Login page configuration has been updated successfully.",
      });

      // Update original data to match current state
      setOriginalFormData(formData);
      setOriginalMethodsState(methodsState);
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset function
  const handleReset = () => {
    setFormData(originalFormData);
    setMethodsState(originalMethodsState);
    
    toast({
      title: "Changes discarded",
      description: "All changes have been reset to the last saved state.",
    });
  };

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMethodsState((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        
        // Update displayOrder for all items
        return reorderedItems.map((item, index) => ({
          ...item,
          displayOrder: index,
        }));
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="flex" style={{ height: "calc(100vh - 64px)" }}>
        {/* Left Panel - Editor */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold">Login Page Editor</h1>
              <p className="text-muted-foreground mt-2">
                Customize authentication experience for each service
              </p>
            </div>

          {/* Service Selector */}
          <Card data-testid="card-service-selector">
            <CardHeader>
              <CardTitle>Select Service</CardTitle>
              <CardDescription>
                Choose a service to customize its login page, or edit the default configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service-select">Service</Label>
                  <Select 
                    value={selectedServiceId || "default"} 
                    onValueChange={(value) => setSelectedServiceId(value === "default" ? null : value)}
                    data-testid="select-service"
                  >
                    <SelectTrigger id="service-select">
                      <SelectValue placeholder="Select a service..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" data-testid="option-default">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Default Configuration</span>
                        </div>
                      </SelectItem>
                      {globalServices?.map((service) => (
                        <SelectItem 
                          key={service.id} 
                          value={service.id}
                          data-testid={`option-service-${service.id}`}
                        >
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedServiceId === null && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Default configuration is used for AuthHub login and as fallback for services without custom configs
                    </p>
                  )}
                </div>

                {isLoading && (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Editor Tabs */}
          {!isLoading && configData && (
            <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-editor">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="branding" data-testid="tab-branding">
                  Branding
                </TabsTrigger>
                <TabsTrigger value="methods" data-testid="tab-methods">
                  Authentication Methods
                </TabsTrigger>
              </TabsList>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Branding & Appearance</CardTitle>
                    <CardDescription>
                      Customize how the login page appears to users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Page Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Welcome to AuthHub"
                        data-testid="input-title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Choose your preferred authentication method"
                        rows={3}
                        data-testid="input-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                      <Input
                        id="logoUrl"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        data-testid="input-logo-url"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Leave empty to hide logo
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="defaultMethod">Default Authentication Method</Label>
                      <Select
                        value={formData.defaultMethod}
                        onValueChange={(value) => setFormData({ ...formData, defaultMethod: value })}
                        data-testid="select-default-method"
                      >
                        <SelectTrigger id="defaultMethod">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {methodsState
                            .filter(m => m.enabled && m.implemented)
                            .map((method) => (
                              <SelectItem 
                                key={method.authMethodId} 
                                value={method.authMethodId}
                                data-testid={`option-method-${method.authMethodId}`}
                              >
                                {method.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        The authentication method shown by default when users visit the login page
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Authentication Methods Tab */}
              <TabsContent value="methods" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Authentication Methods</CardTitle>
                    <CardDescription>
                      Drag to reorder methods and enable/disable them for this login page
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={methodsState.map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3" data-testid="sortable-methods-list">
                          {methodsState.map((method) => (
                            <SortableMethodItem
                              key={method.id}
                              method={method}
                              onToggle={(checked) => {
                                setMethodsState(
                                  methodsState.map(m =>
                                    m.id === method.id ? { ...m, enabled: checked } : m
                                  )
                                );
                              }}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* Action Buttons */}
          {!isLoading && configData && (
            <div className="flex gap-2">
              <Button 
                data-testid="button-save" 
                disabled={!isDirty || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                data-testid="button-reset" 
                disabled={!isDirty || saveMutation.isPending}
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="w-[480px] border-l bg-muted/30 p-6 overflow-auto">
        <div className="sticky top-0">
          <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : configData ? (
            <div className="bg-background rounded-lg shadow-lg p-8 space-y-6">
              {/* Preview Header */}
              {formData.logoUrl && (
                <div className="flex justify-center">
                  <img
                    src={formData.logoUrl}
                    alt="Logo"
                    className="h-12 w-auto"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold">{formData.title}</h1>
                <p className="text-muted-foreground">{formData.description}</p>
              </div>

              {/* Preview Auth Methods */}
              <div className="space-y-2">
                {methodsState
                  .filter(m => m.enabled)
                  .slice(0, 3)
                  .map((method) => (
                    <Button
                      key={method.authMethodId}
                      variant={method.authMethodId === formData.defaultMethod ? "default" : "outline"}
                      className="w-full"
                      disabled
                      data-testid={`preview-button-${method.authMethodId}`}
                    >
                      {method.buttonText || method.defaultButtonText}
                      {!method.implemented && (
                        <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                      )}
                    </Button>
                  ))}
                {methodsState.filter(m => m.enabled).length > 3 && (
                  <p className="text-xs text-center text-muted-foreground">
                    +{methodsState.filter(m => m.enabled).length - 3} more methods
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-8">
              Select a service to see preview
            </p>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
