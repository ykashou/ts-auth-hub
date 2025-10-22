import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Shield, Mail, KeyRound, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const emailLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const uuidLoginSchema = z.object({
  accountId: z.string().optional(),
});

type EmailLoginForm = z.infer<typeof emailLoginSchema>;
type UuidLoginForm = z.infer<typeof uuidLoginSchema>;

export default function WidgetLoginPage() {
  const [loginMethod, setLoginMethod] = useState<"uuid" | "email">("uuid");
  const { toast } = useToast();

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

  // Send message to parent window
  const sendMessageToParent = (type: string, data: any) => {
    if (window.opener) {
      window.opener.postMessage({
        type,
        ...data
      }, '*'); // In production, specify the exact origin
    }
  };

  const emailLoginMutation = useMutation({
    mutationFn: async (data: EmailLoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: "Redirecting...",
      });

      // Send token to parent window
      sendMessageToParent('AUTHHUB_AUTH_SUCCESS', {
        token: data.token,
        user: data.user
      });

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });

      sendMessageToParent('AUTHHUB_AUTH_ERROR', {
        error: error.message || "Invalid email or password"
      });
    },
  });

  const uuidLoginMutation = useMutation({
    mutationFn: async (data: UuidLoginForm) => {
      const response = await apiRequest("POST", "/api/auth/uuid-login", { 
        uuid: data.accountId || undefined 
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: "Redirecting...",
      });

      // Send token to parent window
      sendMessageToParent('AUTHHUB_AUTH_SUCCESS', {
        token: data.token,
        user: data.user
      });

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "UUID login failed",
        description: error.message || "Invalid UUID - please check and try again",
        variant: "destructive",
      });

      sendMessageToParent('AUTHHUB_AUTH_ERROR', {
        error: error.message || "Invalid UUID - please check and try again"
      });
    },
  });

  const generateNewUuidMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/uuid-login", {});
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "UUID Generated!",
        description: `Your new Account ID: ${data.user.id}`,
      });

      // Send token to parent window
      sendMessageToParent('AUTHHUB_AUTH_SUCCESS', {
        token: data.token,
        user: data.user
      });

      // Close popup after short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate UUID",
        variant: "destructive",
      });

      sendMessageToParent('AUTHHUB_AUTH_ERROR', {
        error: error.message || "Failed to generate UUID"
      });
    },
  });

  const onEmailLogin = async (data: EmailLoginForm) => {
    emailLoginMutation.mutate(data);
  };

  const onUuidLogin = async (data: UuidLoginForm) => {
    uuidLoginMutation.mutate(data);
  };

  const handleCancel = () => {
    sendMessageToParent('AUTHHUB_AUTH_CANCEL', {});
    window.close();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center relative">
          {/* Close button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleCancel}
            data-testid="button-close-widget"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">AuthHub</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Secure authentication for connected services
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 p-6 pt-0">
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
              ? "Use an existing Account ID or generate a new one"
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
                          <FormLabel className="text-sm font-medium">Account ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Enter your account ID"
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
        </CardContent>
      </Card>
    </div>
  );
}
