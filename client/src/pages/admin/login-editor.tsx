import { useState, useEffect, useRef } from "react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Save, RotateCcw, Globe, GripVertical, ArrowLeft, Undo2, Redo2, Monitor, Smartphone, Tablet, Upload, Check, X, Palette } from "lucide-react";
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
  
  // Visual Editor state
  const [isVisualEditorFullscreen, setIsVisualEditorFullscreen] = useState(false);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState("");
  const [responsiveView, setResponsiveView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [historyIndex, setHistoryIndex] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [tempMethodConfig, setTempMethodConfig] = useState<{ buttonText: string; buttonVariant: string }>({ buttonText: "", buttonVariant: "default" });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  
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
    primaryColor: "",
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
        primaryColor: configData.config.primaryColor || "#1e40af",
      };
      setFormData(newFormData);
      setOriginalFormData(newFormData);
      setPrimaryColor(configData.config.primaryColor || "#1e40af");
      
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
      formData.defaultMethod !== originalFormData.defaultMethod ||
      formData.primaryColor !== originalFormData.primaryColor;
    
    // Check methods changes (enabled/disabled or order)
    const methodsChanged = JSON.stringify(methodsState) !== JSON.stringify(originalMethodsState);
    
    return brandingChanged || methodsChanged;
  })();

  // Add to history when form data changes
  useEffect(() => {
    if (configData && formData.title && methodsState.length > 0) {
      const newHistoryEntry = { formData, methodsState };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newHistoryEntry);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [formData, methodsState]);

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
          primaryColor: formData.primaryColor || null,
        }
      );

      // Update methods (enabled/disabled, order, buttonText, buttonVariant)
      for (const method of methodsState) {
        const original = originalMethodsState.find(m => m.id === method.id);
        if (!original || 
            method.enabled !== original.enabled || 
            method.displayOrder !== original.displayOrder ||
            method.buttonText !== original.buttonText ||
            method.buttonVariant !== original.buttonVariant) {
          await apiRequest(
            "PATCH",
            `/api/admin/service-auth-method/${method.id}`,
            {
              enabled: method.enabled,
              displayOrder: method.displayOrder,
              buttonText: method.buttonText,
              buttonVariant: method.buttonVariant,
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
      
      // Update auto-save status
      setAutoSaveStatus("saved");
      setTimeout(() => setAutoSaveStatus("idle"), 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save changes. Please try again.",
        variant: "destructive",
      });
      setAutoSaveStatus("idle");
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="branding" data-testid="tab-branding">
                  Branding
                </TabsTrigger>
                <TabsTrigger value="methods" data-testid="tab-methods">
                  Authentication Methods
                </TabsTrigger>
                <TabsTrigger value="visual" data-testid="tab-visual" onClick={() => setIsVisualEditorFullscreen(true)}>
                  Visual Editor
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

              {/* Visual Editor Tab */}
              <TabsContent value="visual" className="p-0 m-0">
                {/* This tab doesn't render anything here - it triggers fullscreen mode */}
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

      {/* Full-Screen Visual Editor */}
      {isVisualEditorFullscreen && configData && (
        <div className="fixed inset-0 bg-background z-50 flex flex-col" data-testid="visual-editor-fullscreen">
          {/* Floating Toolbar */}
          <div className="border-b bg-card p-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setIsVisualEditorFullscreen(false);
                        setActiveTab("branding");
                      }}
                      data-testid="button-exit-visual-editor"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Back to Editor</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={historyIndex <= 0}
                    onClick={() => {
                      if (historyIndex > 0) {
                        const prevState = history[historyIndex - 1];
                        setFormData(prevState.formData);
                        setMethodsState(prevState.methodsState);
                        setHistoryIndex(historyIndex - 1);
                      }
                    }}
                    data-testid="button-undo"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    disabled={historyIndex >= history.length - 1}
                    onClick={() => {
                      if (historyIndex < history.length - 1) {
                        const nextState = history[historyIndex + 1];
                        setFormData(nextState.formData);
                        setMethodsState(nextState.methodsState);
                        setHistoryIndex(historyIndex + 1);
                      }
                    }}
                    data-testid="button-redo"
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>

              {/* Color Picker */}
              <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid="button-color-picker"
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Choose primary color</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-auto p-3" data-testid="color-picker-popover">
                  <div className="space-y-3">
                    <Label>Primary Color</Label>
                    <HexColorPicker color={primaryColor} onChange={setPrimaryColor} />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1e40af"
                      data-testid="input-color-hex"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={async () => {
                          const newFormData = { ...formData, primaryColor };
                          setFormData(newFormData);
                          setShowColorPicker(false);
                          setAutoSaveStatus("saving");
                          
                          try {
                            // Save immediately with updated color
                            await apiRequest(
                              "PATCH",
                              `/api/admin/login-config/${configData!.config.id}`,
                              {
                                title: newFormData.title,
                                description: newFormData.description,
                                logoUrl: newFormData.logoUrl || null,
                                defaultMethod: newFormData.defaultMethod,
                                primaryColor: primaryColor || null,
                              }
                            );
                            
                            // Update original form data
                            setOriginalFormData(newFormData);
                            setAutoSaveStatus("saved");
                            setTimeout(() => setAutoSaveStatus("idle"), 2000);
                            
                            // Invalidate cache
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config", configId] });
                            
                            toast({
                              title: "Color updated",
                              description: `Primary color set to ${primaryColor}`,
                            });
                          } catch (error: any) {
                            setAutoSaveStatus("idle");
                            toast({
                              title: "Save failed",
                              description: error.message || "Failed to save color",
                              variant: "destructive",
                            });
                          }
                        }}
                        data-testid="button-apply-color"
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowColorPicker(false)}
                        data-testid="button-cancel-color"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-2">
              {autoSaveStatus === "saved" && (
                <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400" data-testid="save-status-saved">
                  <Check className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
              {autoSaveStatus === "saving" && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="save-status-saving">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>

            {/* Responsive View Switcher */}
            <div className="flex items-center gap-1 border rounded-md p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={responsiveView === "desktop" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setResponsiveView("desktop")}
                      data-testid="button-view-desktop"
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Desktop View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={responsiveView === "tablet" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setResponsiveView("tablet")}
                      data-testid="button-view-tablet"
                    >
                      <Tablet className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Tablet View</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={responsiveView === "mobile" ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => setResponsiveView("mobile")}
                      data-testid="button-view-mobile"
                    >
                      <Smartphone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mobile View</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 overflow-auto bg-muted/30 p-8 flex items-center justify-center">
            <div 
              className={`bg-background rounded-lg shadow-2xl transition-all duration-300 ${
                responsiveView === "desktop" ? "w-full max-w-md" :
                responsiveView === "tablet" ? "w-[600px]" :
                "w-[375px]"
              }`}
              data-testid="visual-editor-preview"
            >
              <div className="p-8 space-y-6">
                {/* Logo - Editable */}
                <div className="flex justify-center">
                  {formData.logoUrl ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="relative group cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="editable-logo"
                          >
                            <img
                              src={formData.logoUrl}
                              alt="Logo"
                              className="h-16 w-auto transition-opacity group-hover:opacity-70"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Click to change logo</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="border-2 border-dashed rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                            data-testid="editable-logo-placeholder"
                          >
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-2">Click to add logo</p>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Click to add logo</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const url = event.target?.result as string;
                          setFormData({ ...formData, logoUrl: url });
                          setAutoSaveStatus("saving");
                          setTimeout(() => {
                            saveMutation.mutate();
                          }, 500);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    data-testid="input-logo-file"
                  />
                </div>

                {/* Title - Editable */}
                <div className="text-center space-y-2">
                  {editingElement === "title" ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempEditValue}
                        onChange={(e) => setTempEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setFormData({ ...formData, title: tempEditValue });
                            setEditingElement(null);
                            setAutoSaveStatus("saving");
                            setTimeout(() => saveMutation.mutate(), 500);
                          } else if (e.key === "Escape") {
                            setEditingElement(null);
                          }
                        }}
                        className="text-2xl font-bold text-center"
                        autoFocus
                        data-testid="input-title-inline"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setFormData({ ...formData, title: tempEditValue });
                          setEditingElement(null);
                          setAutoSaveStatus("saving");
                          setTimeout(() => saveMutation.mutate(), 500);
                        }}
                        data-testid="button-save-title"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingElement(null)}
                        data-testid="button-cancel-title"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <h1
                            className="text-2xl font-bold cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded transition-all"
                            onClick={() => {
                              setEditingElement("title");
                              setTempEditValue(formData.title);
                            }}
                            data-testid="editable-title"
                          >
                            {formData.title}
                          </h1>
                        </TooltipTrigger>
                        <TooltipContent>Click to edit title</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {/* Description - Editable */}
                  {editingElement === "description" ? (
                    <div className="flex items-start gap-2">
                      <Textarea
                        value={tempEditValue}
                        onChange={(e) => setTempEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.ctrlKey) {
                            setFormData({ ...formData, description: tempEditValue });
                            setEditingElement(null);
                            setAutoSaveStatus("saving");
                            setTimeout(() => saveMutation.mutate(), 500);
                          } else if (e.key === "Escape") {
                            setEditingElement(null);
                          }
                        }}
                        className="text-muted-foreground text-center resize-none"
                        rows={2}
                        autoFocus
                        data-testid="input-description-inline"
                      />
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setFormData({ ...formData, description: tempEditValue });
                            setEditingElement(null);
                            setAutoSaveStatus("saving");
                            setTimeout(() => saveMutation.mutate(), 500);
                          }}
                          data-testid="button-save-description"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingElement(null)}
                          data-testid="button-cancel-description"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p
                            className="text-muted-foreground cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded transition-all px-2 py-1"
                            onClick={() => {
                              setEditingElement("description");
                              setTempEditValue(formData.description);
                            }}
                            data-testid="editable-description"
                          >
                            {formData.description}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>Click to edit description</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                {/* Auth Methods - Draggable & Editable */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={methodsState.map(m => m.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2" data-testid="visual-editor-methods">
                      {methodsState
                        .filter(m => m.enabled)
                        .slice(0, 3)
                        .map((method) => (
                          <div key={method.id} className="relative group">
                            <Popover
                              open={editingMethodId === method.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  setEditingMethodId(method.id);
                                  setTempMethodConfig({
                                    buttonText: method.buttonText || method.defaultButtonText,
                                    buttonVariant: method.buttonVariant || method.defaultButtonVariant,
                                  });
                                } else {
                                  setEditingMethodId(null);
                                }
                              }}
                            >
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <div className="cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded transition-all">
                                        <Button
                                          variant={method.authMethodId === formData.defaultMethod ? "default" : "outline"}
                                          className="w-full relative"
                                          data-testid={`visual-preview-button-${method.authMethodId}`}
                                        >
                                          <GripVertical className="h-4 w-4 absolute left-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                          {method.buttonText || method.defaultButtonText}
                                          {!method.implemented && (
                                            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
                                          )}
                                        </Button>
                                      </div>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Click to customize or drag to reorder</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <PopoverContent className="w-80" data-testid={`method-config-popover-${method.authMethodId}`}>
                                <div className="space-y-3">
                                  <div>
                                    <Label>Method: {method.name}</Label>
                                    <p className="text-sm text-muted-foreground">{method.description}</p>
                                  </div>
                                  <div>
                                    <Label htmlFor="button-text">Button Text</Label>
                                    <Input
                                      id="button-text"
                                      value={tempMethodConfig.buttonText}
                                      onChange={(e) => setTempMethodConfig({ ...tempMethodConfig, buttonText: e.target.value })}
                                      placeholder={method.defaultButtonText}
                                      data-testid="input-method-button-text"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="button-variant">Button Variant</Label>
                                    <Select
                                      value={tempMethodConfig.buttonVariant}
                                      onValueChange={(value) => setTempMethodConfig({ ...tempMethodConfig, buttonVariant: value })}
                                    >
                                      <SelectTrigger id="button-variant" data-testid="select-method-variant">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="outline">Outline</SelectItem>
                                        <SelectItem value="ghost">Ghost</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={async () => {
                                        try {
                                          setAutoSaveStatus("saving");
                                          setEditingMethodId(null);
                                          
                                          // Save to backend first
                                          await apiRequest(
                                            "PATCH",
                                            `/api/admin/service-auth-method/${method.id}`,
                                            {
                                              buttonText: tempMethodConfig.buttonText,
                                              buttonVariant: tempMethodConfig.buttonVariant,
                                            }
                                          );
                                          
                                          // Update local state
                                          const updatedMethods = methodsState.map(m => 
                                            m.id === method.id 
                                              ? { ...m, buttonText: tempMethodConfig.buttonText, buttonVariant: tempMethodConfig.buttonVariant }
                                              : m
                                          );
                                          setMethodsState(updatedMethods);
                                          setOriginalMethodsState(updatedMethods); // Update original to sync dirty state
                                          
                                          setAutoSaveStatus("saved");
                                          setTimeout(() => setAutoSaveStatus("idle"), 2000);
                                          
                                          // Invalidate cache to ensure consistency
                                          queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config", configId] });
                                          
                                          toast({
                                            title: "Method updated",
                                            description: `${method.name} customization saved`,
                                          });
                                        } catch (error: any) {
                                          setAutoSaveStatus("idle");
                                          toast({
                                            title: "Save failed",
                                            description: error.message || "Failed to save method customization",
                                            variant: "destructive",
                                          });
                                        }
                                      }}
                                      data-testid="button-save-method-config"
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingMethodId(null)}
                                      data-testid="button-cancel-method-config"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        ))}
                      {methodsState.filter(m => m.enabled).length > 3 && (
                        <p className="text-xs text-center text-muted-foreground">
                          +{methodsState.filter(m => m.enabled).length - 3} more methods
                        </p>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
