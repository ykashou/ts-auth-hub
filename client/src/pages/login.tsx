import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Mail, KeyRound, Loader2, Zap, Cloud, Fingerprint, Sparkles, type LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { setToken, setUserRole } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

const emailLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const uuidLoginSchema = z.object({
  accountId: z.string().optional(),
});

type EmailLoginForm = z.infer<typeof emailLoginSchema>;
type UuidLoginForm = z.infer<typeof uuidLoginSchema>;

// Type definitions for login configuration
interface LoginConfig {
  id: string;
  serviceId: string | null;
  title: string;
  description: string;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultMethod: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
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

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<string | null>(null);
  const [userSelectedMethod, setUserSelectedMethod] = useState(false); // Track if user manually selected a method
  const [lastConfigId, setLastConfigId] = useState<string | null>(null); // Track config changes
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch AuthHub's system service ID
  const { data: systemServiceData } = useQuery<{ id: string; name: string }>({
    queryKey: ["/api/system-service"],
    enabled: !serviceId, // Only fetch if serviceId not provided in URL
  });

  // Read redirect_uri and service_id from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect_uri');
    const service = urlParams.get('service_id');
    if (redirect) {
      setRedirectUri(decodeURIComponent(redirect));
    }
    if (service) {
      setServiceId(service);
    }
  }, []);

  // Set serviceId to system service if no URL param provided
  useEffect(() => {
    if (!serviceId && systemServiceData?.id) {
      setServiceId(systemServiceData.id);
    }
  }, [systemServiceData, serviceId]);

  // Fetch login configuration
  const { data: loginConfigData, isLoading: isLoadingConfig, isError, error } = useQuery<LoginConfigResponse>({
    queryKey: serviceId ? ["/api/login-config", serviceId] : ["/api/login-config"],
    queryFn: serviceId 
      ? () => fetch(`/api/login-config?serviceId=${serviceId}`).then(res => res.json())
      : undefined,
    enabled: !!serviceId,
  });

  // Helper to get icon component from icon name
  const getIcon = (iconName: string): LucideIcon => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent || Shield;
  };

  // Filter enabled methods and sort by displayOrder
  const enabledMethods = loginConfigData?.methods
    ?.filter(m => m.enabled)
    .sort((a, b) => a.displayOrder - b.displayOrder) || [];

  // Set default login method from config, respecting user manual selection
  // Reset when config changes (new service) or when current selection is unavailable
  useEffect(() => {
    if (!loginConfigData?.config) return;
    
    const currentConfigId = loginConfigData.config.id;
    const configDefault = loginConfigData.config.defaultMethod;
    const availableMethodIds = enabledMethods.map(m => m.authMethodId);
    
    // If config changed (new service loaded), reset to new service's default
    if (lastConfigId && lastConfigId !== currentConfigId) {
      setLoginMethod(configDefault);
      setUserSelectedMethod(false);
      setLastConfigId(currentConfigId);
      return;
    }
    
    // Set lastConfigId on first load
    if (!lastConfigId) {
      setLastConfigId(currentConfigId);
    }
    
    // If loginMethod is set but not available in current config, reset it
    if (loginMethod && !availableMethodIds.includes(loginMethod)) {
      setLoginMethod(configDefault);
      setUserSelectedMethod(false);
      return;
    }
    
    // If user hasn't manually selected, use config default
    if (!userSelectedMethod && configDefault) {
      setLoginMethod(configDefault);
    }
  }, [loginConfigData?.config, loginConfigData?.config?.id, loginConfigData?.config?.defaultMethod, enabledMethods, loginMethod, userSelectedMethod, lastConfigId]);

  // Get primary methods (email, uuid) and alternative methods
  const primaryMethods = enabledMethods.filter(m => m.authMethodId === "email" || m.authMethodId === "uuid");
  const alternativeMethods = enabledMethods.filter(m => m.authMethodId !== "email" && m.authMethodId !== "uuid");

  // Helper to handle post-authentication redirect
  const handlePostAuthRedirect = (token: string, user: any) => {
    if (redirectUri) {
      // OAuth redirect flow: redirect back to external service with token
      const separator = redirectUri.includes('?') ? '&' : '?';
      window.location.href = `${redirectUri}${separator}token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(user.id)}`;
    } else {
      // Internal flow: go to dashboard
      setLocation("/dashboard");
    }
  };

  const emailForm = useForm<EmailLoginForm>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const uuidForm = useForm<UuidLoginForm>({
    resolver: zodResolver(uuidLoginSchema),
    defaultValues: {
      accountId: "",
    },
  });

  const emailLoginMutation = useMutation({
    mutationFn: async (data: EmailLoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", {
        ...data,
        serviceId: serviceId || undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      // Only set token in localStorage if staying on AuthHub (not redirecting away)
      if (!redirectUri) {
        setToken(data.token);
        setUserRole(data.user.role);
        // Clear all cached data when logging in to prevent showing previous user's data
        queryClient.clear();
      }
      toast({
        title: "Login successful",
        description: `Welcome back! Your UUID is ${data.user.id}`,
      });
      handlePostAuthRedirect(data.token, data.user);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const uuidLoginMutation = useMutation({
    mutationFn: async (data: UuidLoginForm) => {
      const response = await apiRequest("POST", "/api/auth/uuid-login", { 
        uuid: data.accountId || undefined,
        serviceId: serviceId || undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      // Only set token in localStorage if staying on AuthHub (not redirecting away)
      if (!redirectUri) {
        setToken(data.token);
        setUserRole(data.user.role);
        // Clear all cached data when logging in to prevent showing previous user's data
        queryClient.clear();
      }
      
      // Show admin promotion toast if user is first user
      if (data.user.role === 'admin' && !data.user.email) {
        toast({
          title: "Login successful",
          description: `🎉 First user - promoted to Admin! UUID: ${data.user.id}`,
        });
      } else {
        toast({
          title: "Login successful",
          description: data.user.email 
            ? `Welcome back! Your UUID is ${data.user.id}`
            : `New UUID created: ${data.user.id}`,
        });
      }
      handlePostAuthRedirect(data.token, data.user);
    },
    onError: (error: any) => {
      toast({
        title: "UUID login failed",
        description: error.message || "Invalid UUID - please check and try again",
        variant: "destructive",
      });
    },
  });

  const generateNewUuidMutation = useMutation({
    mutationFn: async () => {
      // Call without UUID to auto-generate
      const response = await apiRequest("POST", "/api/auth/uuid-login", {
        serviceId: serviceId || undefined,
      });
      return response;
    },
    onSuccess: (data) => {
      // Only set token in localStorage if staying on AuthHub (not redirecting away)
      if (!redirectUri) {
        setToken(data.token);
        setUserRole(data.user.role);
        // Clear all cached data when logging in to prevent showing previous user's data
        queryClient.clear();
      }
      
      // Show admin promotion toast if user is first user
      if (data.user.role === 'admin') {
        toast({
          title: "UUID Generated!",
          description: `🎉 First user - promoted to Admin! ID: ${data.user.id}`,
        });
      } else {
        toast({
          title: "UUID Generated!",
          description: `Your new Account ID: ${data.user.id}`,
        });
      }
      handlePostAuthRedirect(data.token, data.user);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate UUID",
        variant: "destructive",
      });
    },
  });

  const onEmailLogin = async (data: EmailLoginForm) => {
    emailLoginMutation.mutate(data);
  };

  const onUuidLogin = async (data: UuidLoginForm) => {
    uuidLoginMutation.mutate(data);
  };

  // Show loading state while fetching configuration or system service
  if (isLoadingConfig || (!serviceId && !systemServiceData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if config fetch failed
  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-semibold text-destructive">Configuration Error</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Failed to load login configuration. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground text-center">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = loginConfigData?.config;
  const LogoIcon = config?.logoUrl ? null : getIcon("Shield");
  
  // Use configured default method or fallback to first available primary method or "uuid"
  const activeMethod = loginMethod || config?.defaultMethod || primaryMethods[0]?.authMethodId || "uuid";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            {config?.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-12 h-12 rounded-lg object-cover" />
            ) : LogoIcon ? (
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <LogoIcon className="w-6 h-6 text-primary-foreground" />
              </div>
            ) : null}
          </div>
          <CardTitle className="text-2xl font-semibold">{config?.title || "Welcome to AuthHub"}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {config?.description || "Choose your preferred authentication method"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Authentication Method Selector - Dynamic Primary Methods */}
          {primaryMethods.length > 1 && (
            <>
              <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${primaryMethods.length}, 1fr)` }}>
                {primaryMethods.map((method) => {
                  const Icon = getIcon(method.icon);
                  return (
                    <Button
                      key={method.authMethodId}
                      type="button"
                      variant={activeMethod === method.authMethodId ? "default" : "outline"}
                      className="w-full"
                      onClick={() => {
                        setLoginMethod(method.authMethodId);
                        setUserSelectedMethod(true);
                      }}
                      data-testid={`button-${method.authMethodId}-login-tab`}
                      disabled={emailLoginMutation.isPending || uuidLoginMutation.isPending || generateNewUuidMutation.isPending}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {method.name}
                    </Button>
                  );
                })}
              </div>

              {/* Show help text for selected method */}
              {primaryMethods.find(m => m.authMethodId === activeMethod)?.helpText && (
                <p className="text-xs text-center text-muted-foreground">
                  {primaryMethods.find(m => m.authMethodId === activeMethod)?.helpText || 
                   primaryMethods.find(m => m.authMethodId === activeMethod)?.defaultHelpText}
                </p>
              )}
            </>
          )}

          <Separator />

          {/* UUID Login Form */}
          {activeMethod === "uuid" && (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    GENERATE NEW ACCOUNT ID
                  </p>
                  <Button
                    type="button"
                    className="w-full h-11"
                    variant="default"
                    data-testid="button-generate-uuid"
                    onClick={() => generateNewUuidMutation.mutate()}
                    disabled={generateNewUuidMutation.isPending || uuidLoginMutation.isPending}
                  >
                    {generateNewUuidMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate New Account ID"
                    )}
                  </Button>
                </div>

                <Separator />
                
                <p className="text-xs text-center text-muted-foreground">
                  OR USE EXISTING ACCOUNT ID
                </p>

                <Form {...uuidForm}>
                  <form onSubmit={uuidForm.handleSubmit(onUuidLogin)} className="space-y-4">
                    <FormField
                      control={uuidForm.control}
                      name="accountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Account ID (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your existing account ID"
                              className="h-11"
                              data-testid="input-account-id"
                              disabled={uuidLoginMutation.isPending || generateNewUuidMutation.isPending}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full h-11"
                      data-testid="button-uuid-submit"
                      disabled={uuidLoginMutation.isPending || generateNewUuidMutation.isPending}
                    >
                      {uuidLoginMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        "Log In with Existing ID"
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </>
          )}

          {/* Email Login Form */}
          {activeMethod === "email" && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailLogin)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Enter your email"
                          className="h-11"
                          data-testid="input-email"
                          disabled={emailLoginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter your password"
                          className="h-11"
                          data-testid="input-password"
                          disabled={emailLoginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11"
                  data-testid="button-email-submit"
                  disabled={emailLoginMutation.isPending}
                >
                  {emailLoginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </Form>
          )}

          <Separator className="my-4" />

          {/* Alternative Authentication Methods - Dynamic from Config */}
          {alternativeMethods.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-center text-muted-foreground">
                OR AUTHENTICATE WITH
              </p>
              
              <div className="grid grid-cols-1 gap-2">
                {alternativeMethods.map((method) => {
                  const Icon = getIcon(method.icon);
                  const buttonText = method.buttonText || method.defaultButtonText;
                  const buttonVariant = (method.buttonVariant || method.defaultButtonVariant) as any;
                  const showBadge = method.showComingSoonBadge || !method.implemented;
                  
                  return (
                    <Button
                      key={method.authMethodId}
                      type="button"
                      variant={buttonVariant}
                      className="w-full h-11 relative"
                      disabled={showBadge}
                      data-testid={`button-${method.authMethodId}-login`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {buttonText}
                      {showBadge && (
                        <Badge 
                          variant="secondary" 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                          data-testid={`badge-${method.authMethodId}-coming-soon`}
                        >
                          Coming Soon
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary font-medium hover:underline" data-testid="link-register">
                Create new account
              </Link>
            </p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
