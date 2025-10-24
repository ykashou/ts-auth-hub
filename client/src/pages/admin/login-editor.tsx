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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Save, RotateCcw, Globe, GripVertical, Undo2, Redo2, Monitor, Smartphone, Tablet, Upload, Check, X, Palette, Settings } from "lucide-react";
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

interface VisualSortableMethodItemProps {
  method: AuthMethod;
  editingMethodId: string | null;
  setEditingMethodId: (id: string | null) => void;
  tempMethodConfig: { buttonText: string; buttonVariant: string };
  setTempMethodConfig: (config: { buttonText: string; buttonVariant: string }) => void;
  setAutoSaveStatus: (status: "idle" | "saving" | "saved") => void;
  setMethodsState: (methods: AuthMethod[] | ((prev: AuthMethod[]) => AuthMethod[])) => void;
  methodsState: AuthMethod[];
  setOriginalMethodsState: (methods: AuthMethod[]) => void;
  toast: any;
}

function VisualSortableMethodItem({ 
  method, 
  editingMethodId,
  setEditingMethodId,
  tempMethodConfig,
  setTempMethodConfig,
  setAutoSaveStatus,
  setMethodsState,
  methodsState,
  setOriginalMethodsState,
  toast,
}: VisualSortableMethodItemProps) {
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

  const isEditing = editingMethodId === method.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
      data-testid={`visual-method-${method.authMethodId}`}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Button
                variant={method.buttonVariant as any || "outline"}
                className="w-full relative"
                data-testid={`button-auth-${method.authMethodId}`}
              >
                <span className="absolute left-2 cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 transition-opacity" {...attributes} {...listeners}>
                  <GripVertical className="h-4 w-4" />
                </span>
                <span className="flex-1">{method.buttonText || method.defaultButtonText}</span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click gear icon to customize</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Settings Icon */}
      <Popover open={isEditing} onOpenChange={(open) => {
        if (!open) setEditingMethodId(null);
      }}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="absolute -right-2 -top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              setEditingMethodId(method.id);
              setTempMethodConfig({
                buttonText: method.buttonText || method.defaultButtonText,
                buttonVariant: method.buttonVariant || method.defaultButtonVariant,
              });
            }}
            data-testid={`button-edit-method-${method.authMethodId}`}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" data-testid={`popover-method-config-${method.authMethodId}`}>
          <div className="space-y-4">
            <h4 className="font-medium">Customize {method.name}</h4>
            <div>
              <Label>Button Text</Label>
              <Input
                value={tempMethodConfig.buttonText}
                onChange={(e) => setTempMethodConfig({ ...tempMethodConfig, buttonText: e.target.value })}
                placeholder={method.defaultButtonText}
                data-testid="input-method-button-text"
              />
            </div>
            <div>
              <Label>Button Variant</Label>
              <Select
                value={tempMethodConfig.buttonVariant}
                onValueChange={(value) => setTempMethodConfig({ ...tempMethodConfig, buttonVariant: value })}
              >
                <SelectTrigger data-testid="select-method-variant">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
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
                    
                    await apiRequest(
                      "PATCH",
                      `/api/admin/service-auth-method/${method.id}`,
                      {
                        buttonText: tempMethodConfig.buttonText,
                        buttonVariant: tempMethodConfig.buttonVariant,
                      }
                    );
                    
                    const updatedMethods = methodsState.map(m => 
                      m.id === method.id 
                        ? { ...m, buttonText: tempMethodConfig.buttonText, buttonVariant: tempMethodConfig.buttonVariant }
                        : m
                    );
                    setMethodsState(updatedMethods);
                    setOriginalMethodsState(updatedMethods);
                    
                    setAutoSaveStatus("saved");
                    setTimeout(() => setAutoSaveStatus("idle"), 2000);
                    
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config"] });
                    
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
  );
}

export default function LoginEditorPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Editor state
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [tempEditValue, setTempEditValue] = useState("");
  const [responsiveView, setResponsiveView] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [tempMethodConfig, setTempMethodConfig] = useState({ buttonText: "", buttonVariant: "default" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Service selector
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  // Fetch global services
  const { data: globalServices } = useQuery<GlobalService[]>({
    queryKey: ["/api/admin/global-services"],
  });

  // Compute config ID
  const configId = selectedServiceId || "default";

  // Fetch login config
  const { data: configData, isLoading } = useQuery<LoginConfigResponse>({
    queryKey: ["/api/admin/login-config", configId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedServiceId) {
        params.append("serviceId", selectedServiceId);
      }
      const response = await fetch(`/api/login-config?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch config");
      return response.json();
    },
    enabled: !!configId,
  });

  // Local state for form
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
      
      const sortedMethods = [...configData.methods].sort((a, b) => a.displayOrder - b.displayOrder);
      setMethodsState(sortedMethods);
      setOriginalMethodsState(sortedMethods);
    }
  }, [configData]);

  // Check if data has changed (dirty state)
  const isDirty = (() => {
    if (!configData) return false;
    
    const brandingChanged = 
      formData.title !== originalFormData.title ||
      formData.description !== originalFormData.description ||
      formData.logoUrl !== originalFormData.logoUrl ||
      formData.defaultMethod !== originalFormData.defaultMethod ||
      formData.primaryColor !== originalFormData.primaryColor;
    
    const methodsChanged = JSON.stringify(methodsState) !== JSON.stringify(originalMethodsState);
    
    return brandingChanged || methodsChanged;
  })();

  // Auto-save mutation
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

      // Update methods
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/login-config", configId] });
      queryClient.invalidateQueries({ queryKey: ["/api/login-config"] });
      
      toast({
        title: "Changes saved",
        description: "Login page configuration has been updated successfully.",
      });

      setOriginalFormData(formData);
      setOriginalMethodsState(methodsState);
      
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
        
        return reorderedItems.map((item, index) => ({
          ...item,
          displayOrder: index,
        }));
      });
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle logo upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
        setAutoSaveStatus("saving");
        setTimeout(() => saveMutation.mutate(), 500);
      };
      reader.readAsDataURL(file);
    }
  };

  // Inline edit handlers
  const startEditing = (element: string, currentValue: string) => {
    setEditingElement(element);
    setTempEditValue(currentValue);
  };

  const saveEdit = () => {
    if (editingElement === "title") {
      setFormData({ ...formData, title: tempEditValue });
    } else if (editingElement === "description") {
      setFormData({ ...formData, description: tempEditValue });
    }
    setEditingElement(null);
    setAutoSaveStatus("saving");
    setTimeout(() => saveMutation.mutate(), 500);
  };

  const cancelEdit = () => {
    setEditingElement(null);
    setTempEditValue("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex flex-1" style={{ height: "calc(100vh - 64px)" }}>
        {/* Left Sidebar - Configuration Panel */}
        <div className="w-80 border-r bg-card">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Service Selector */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Service</h3>
                <Select 
                  value={selectedServiceId || "default"} 
                  onValueChange={(value) => setSelectedServiceId(value === "default" ? null : value)}
                  data-testid="select-service"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default" data-testid="option-default">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>Default Config</span>
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
              </div>

              <Separator />

              {/* Branding Section */}
              {configData && (
                <>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Branding</h3>
                    
                    <div>
                      <Label htmlFor="title" className="text-xs">Page Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Welcome to AuthHub"
                        data-testid="input-title"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description" className="text-xs">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Choose your preferred authentication method"
                        rows={3}
                        data-testid="input-description"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="logoUrl" className="text-xs">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="https://example.com/logo.png"
                        data-testid="input-logo-url"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="defaultMethod" className="text-xs">Default Method</Label>
                      <Select
                        value={formData.defaultMethod}
                        onValueChange={(value) => setFormData({ ...formData, defaultMethod: value })}
                      >
                        <SelectTrigger id="defaultMethod" className="mt-1" data-testid="select-default-method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {methodsState.filter(m => m.implemented && m.enabled).map((method) => (
                            <SelectItem key={method.authMethodId} value={method.authMethodId}>
                              {method.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Authentication Methods */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Authentication Methods</h3>
                    <p className="text-xs text-muted-foreground">Enable or disable methods</p>
                    
                    <div className="space-y-2">
                      {methodsState.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-2 rounded border" data-testid={`method-toggle-${method.authMethodId}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{method.name}</span>
                            {!method.implemented && (
                              <Badge variant="secondary" className="text-xs">Soon</Badge>
                            )}
                          </div>
                          <Switch
                            checked={method.enabled}
                            onCheckedChange={(checked) => {
                              setMethodsState(methodsState.map(m => 
                                m.id === method.id ? { ...m, enabled: checked } : m
                              ));
                            }}
                            data-testid={`switch-method-${method.authMethodId}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Save/Reset Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveMutation.mutate()}
                      disabled={!isDirty || saveMutation.isPending}
                      className="flex-1"
                      data-testid="button-save"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={!isDirty}
                      data-testid="button-reset"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </>
              )}

              {isLoading && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Canvas - Visual Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          {configData && (
            <>
              {/* Toolbar */}
              <div className="border-b bg-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Responsive View Switcher */}
                  <div className="flex items-center gap-1 p-1 bg-muted rounded-md">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={responsiveView === "desktop" ? "default" : "ghost"}
                            onClick={() => setResponsiveView("desktop")}
                            data-testid="button-view-desktop"
                            className="h-7 w-7"
                          >
                            <Monitor className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Desktop View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={responsiveView === "tablet" ? "default" : "ghost"}
                            onClick={() => setResponsiveView("tablet")}
                            data-testid="button-view-tablet"
                            className="h-7 w-7"
                          >
                            <Tablet className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Tablet View</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant={responsiveView === "mobile" ? "default" : "ghost"}
                            onClick={() => setResponsiveView("mobile")}
                            data-testid="button-view-mobile"
                            className="h-7 w-7"
                          >
                            <Smartphone className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Mobile View</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {/* Color Picker */}
                  <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-color-picker">
                        <Palette className="h-4 w-4 mr-2" />
                        Primary Color
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto" data-testid="popover-color-picker">
                      <div className="space-y-3">
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
                                await apiRequest(
                                  "PATCH",
                                  `/api/admin/login-config/${configData.config.id}`,
                                  {
                                    title: newFormData.title,
                                    description: newFormData.description,
                                    logoUrl: newFormData.logoUrl || null,
                                    defaultMethod: newFormData.defaultMethod,
                                    primaryColor: primaryColor || null,
                                  }
                                );
                                
                                setOriginalFormData(newFormData);
                                setAutoSaveStatus("saved");
                                setTimeout(() => setAutoSaveStatus("idle"), 2000);
                                
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
                  {autoSaveStatus === "saving" && (
                    <span className="text-sm text-muted-foreground flex items-center gap-2" data-testid="text-saving">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span className="text-sm text-green-600 flex items-center gap-2" data-testid="text-saved">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Canvas */}
              <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
                <div
                  className={`bg-background rounded-lg shadow-xl border transition-all duration-300 ${
                    responsiveView === "mobile"
                      ? "w-[375px]"
                      : responsiveView === "tablet"
                      ? "w-[768px]"
                      : "w-[1024px]"
                  }`}
                  data-testid="visual-editor-preview"
                >
                  <div className="p-8 space-y-6">
                    {/* Logo - Click to Upload */}
                    {formData.logoUrl && (
                      <div className="flex justify-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                className="cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded transition-all"
                                onClick={() => fileInputRef.current?.click()}
                                data-testid="logo-upload-trigger"
                              >
                                <img 
                                  src={formData.logoUrl} 
                                  alt="Logo" 
                                  className="h-16 w-auto"
                                  data-testid="img-logo"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Click to change logo</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          data-testid="input-logo-file"
                        />
                      </div>
                    )}

                    {/* Title - Click to Edit */}
                    <div className="text-center">
                      {editingElement === "title" ? (
                        <div className="flex flex-col gap-2">
                          <Input
                            value={tempEditValue}
                            onChange={(e) => setTempEditValue(e.target.value)}
                            className="text-center text-3xl font-bold"
                            autoFocus
                            data-testid="input-edit-title"
                          />
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={saveEdit} data-testid="button-save-title">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} data-testid="button-cancel-title">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h1
                                className="text-3xl font-bold cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded px-2 py-1 transition-all"
                                onClick={() => startEditing("title", formData.title)}
                                data-testid="text-title"
                              >
                                {formData.title}
                              </h1>
                            </TooltipTrigger>
                            <TooltipContent>Click to edit title</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Description - Click to Edit */}
                    <div className="text-center">
                      {editingElement === "description" ? (
                        <div className="flex flex-col gap-2">
                          <Textarea
                            value={tempEditValue}
                            onChange={(e) => setTempEditValue(e.target.value)}
                            className="text-center resize-none"
                            rows={2}
                            autoFocus
                            data-testid="input-edit-description"
                          />
                          <div className="flex gap-2 justify-center">
                            <Button size="sm" onClick={saveEdit} data-testid="button-save-description">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit} data-testid="button-cancel-description">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p
                                className="text-muted-foreground cursor-pointer hover:outline hover:outline-2 hover:outline-primary hover:outline-offset-2 rounded px-2 py-1 transition-all"
                                onClick={() => startEditing("description", formData.description)}
                                data-testid="text-description"
                              >
                                {formData.description}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>Click to edit description</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>

                    {/* Authentication Methods - Drag to Reorder */}
                    <div className="space-y-3 max-w-md mx-auto">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={methodsState.filter(m => m.enabled).map(m => m.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2" data-testid="visual-editor-methods">
                            {methodsState
                              .filter(m => m.enabled)
                              .map((method) => (
                                <VisualSortableMethodItem
                                  key={method.id}
                                  method={method}
                                  editingMethodId={editingMethodId}
                                  setEditingMethodId={setEditingMethodId}
                                  tempMethodConfig={tempMethodConfig}
                                  setTempMethodConfig={setTempMethodConfig}
                                  setAutoSaveStatus={setAutoSaveStatus}
                                  setMethodsState={setMethodsState}
                                  methodsState={methodsState}
                                  setOriginalMethodsState={setOriginalMethodsState}
                                  toast={toast}
                                />
                              ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
