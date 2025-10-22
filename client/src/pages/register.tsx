import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Shield, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { setToken } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [generatedUuid, setGeneratedUuid] = useState<string | null>(null);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Read redirect_uri from URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect_uri');
    if (redirect) {
      setRedirectUri(decodeURIComponent(redirect));
    }
  }, []);

  // Helper to handle post-authentication redirect
  const handlePostAuthRedirect = (token: string, userId: string) => {
    if (redirectUri) {
      // OAuth redirect flow: redirect back to external service with token
      const separator = redirectUri.includes('?') ? '&' : '?';
      window.location.href = `${redirectUri}${separator}token=${encodeURIComponent(token)}&user_id=${encodeURIComponent(userId)}`;
    } else {
      // Internal flow: go to dashboard
      setLocation("/dashboard");
    }
  };

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("POST", "/api/auth/register", {
        email: data.email,
        password: data.password,
      });
      return response;
    },
    onSuccess: (data) => {
      // Only set token in localStorage if staying on AuthHub (not redirecting away)
      if (!redirectUri) {
        setToken(data.token);
      }
      setAuthToken(data.token);
      setGeneratedUuid(data.user.id);
      toast({
        title: "Account created successfully!",
        description: "Your unique UUID has been generated",
      });
      // Redirect after 3 seconds to show UUID
      setTimeout(() => {
        handlePostAuthRedirect(data.token, data.user.id);
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  if (generatedUuid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-semibold">Account Created!</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Your unique UUID has been generated
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs text-muted-foreground mb-2">Your UUID:</p>
              <p className="font-mono text-sm break-all">{generatedUuid}</p>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Save this UUID for future reference. Redirecting to dashboard...
            </p>

            <Button
              className="w-full"
              onClick={() => authToken && handlePostAuthRedirect(authToken, generatedUuid!)}
              data-testid="button-continue"
            >
              {redirectUri ? "Continue to Application" : "Continue to Dashboard"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold">Create Your Account</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Register to receive your unique UUID for authentication
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="your.email@example.com"
                        className="h-11"
                        data-testid="input-email"
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="At least 6 characters"
                        className="h-11"
                        data-testid="input-password"
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Re-enter your password"
                        className="h-11"
                        data-testid="input-confirm-password"
                        disabled={registerMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 mt-6"
                data-testid="button-register"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </Form>

          <Separator />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="flex items-center justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-back"
              disabled={registerMutation.isPending}
              onClick={() => setLocation("/login")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
