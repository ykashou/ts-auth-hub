import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, KeyRound, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { setToken } from "@/lib/auth";
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

export default function LoginPage() {
  const [loginMethod, setLoginMethod] = useState<"uuid" | "email">("uuid");
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Read redirect_uri and serviceId from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect_uri');
    const service = urlParams.get('serviceId');
    if (redirect) {
      setRedirectUri(decodeURIComponent(redirect));
    }
    if (service) {
      setServiceId(service);
    }
  }, []);

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
        // Clear all cached data when logging in to prevent showing previous user's data
        queryClient.clear();
      }
      toast({
        title: "Login successful",
        description: data.user.email 
          ? `Welcome back! Your UUID is ${data.user.id}`
          : `New UUID created: ${data.user.id}`,
      });
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
        // Clear all cached data when logging in to prevent showing previous user's data
        queryClient.clear();
      }
      toast({
        title: "UUID Generated!",
        description: `Your new Account ID: ${data.user.id}`,
      });
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to AuthHub</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Choose your preferred authentication method
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Authentication Method Selector */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={loginMethod === "uuid" ? "default" : "outline"}
              className="w-full"
              onClick={() => setLoginMethod("uuid")}
              data-testid="button-uuid-login-tab"
              disabled={emailLoginMutation.isPending || uuidLoginMutation.isPending}
            >
              <KeyRound className="w-4 h-4 mr-2" />
              UUID Login
            </Button>
            <Button
              type="button"
              variant={loginMethod === "email" ? "default" : "outline"}
              className="w-full"
              onClick={() => setLoginMethod("email")}
              data-testid="button-email-login-tab"
              disabled={emailLoginMutation.isPending || uuidLoginMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Login
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {loginMethod === "uuid" 
              ? "Use an existing Account ID or generate a new one for anonymous authentication"
              : "Sign in with your email and password"}
          </p>

          <Separator />

          {/* UUID Login Form */}
          {loginMethod === "uuid" && (
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
          {loginMethod === "email" && (
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
