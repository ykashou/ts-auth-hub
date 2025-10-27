import { Button } from "@/components/ui/button";
import { Shield, Boxes, Settings2, FileText, Code2, LogOut, Home, Users, ShieldCheck, ChevronDown, Layout, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { clearToken, getUserRole } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  const handleLogout = async () => {
    try {
      // Call backend logout endpoint for audit logging
      // Important: Keep the token until after the request completes
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch (error) {
      console.error("Logout audit failed:", error);
      // Continue with logout even if audit fails
    }
    
    // Clear token and redirect AFTER the logout request completes
    clearToken();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
    setLocation("/login");
  };

  const userManagementItems = [
    { path: "/admin/users", label: "Users", icon: Users, testId: "button-user-management" },
    { path: "/admin/rbac", label: "RBAC Models", icon: Shield, testId: "button-rbac-models" },
    { path: "/admin/roles", label: "Role Assignments", icon: ShieldCheck, testId: "button-role-assignments" },
  ];

  const serviceManagementItems = [
    { path: "/services", label: "Service List", icon: Boxes, testId: "button-services" },
    { path: "/admin/service-configs", label: "Service Configurations", icon: Settings2, testId: "button-config" },
    { path: "/admin/auth-configs", label: "Authentication Variants", icon: Layout, testId: "button-login-configs" },
  ];

  const documentationItems = [
    { path: "/docs/api", label: "API Docs", icon: FileText, testId: "button-api-docs" },
    { path: "/docs/widget", label: "Widget", icon: Code2, testId: "button-widget-docs" },
  ];

  const isUserManagementActive = userManagementItems.some(item => location === item.path);
  const isServiceManagementActive = serviceManagementItems.some(item => location === item.path);
  const isDocumentationActive = documentationItems.some(item => location === item.path);

  return (
    <header className="sticky top-0 z-10 px-4 sm:px-6 lg:px-8 pt-4">
      <div className="max-w-7xl mx-auto bg-card border border-border rounded-full shadow-md" data-testid="navbar-container">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">AuthHub</h1>
              <p className="text-xs text-muted-foreground">Centralized Authentication System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Dashboard Button */}
            <Button
              variant={location === "/dashboard" ? "default" : "outline"}
              size="sm"
              data-testid="button-dashboard"
              onClick={() => setLocation("/dashboard")}
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>

            {/* User Management Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isUserManagementActive ? "default" : "outline"}
                    size="sm"
                    data-testid="dropdown-user-management"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    User Management
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {userManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        data-testid={item.testId}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Service Management Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isServiceManagementActive ? "default" : "outline"}
                    size="sm"
                    data-testid="dropdown-service-management"
                  >
                    <Boxes className="w-4 h-4 mr-2" />
                    Service Management
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {serviceManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        data-testid={item.testId}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Documentation Dropdown */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isDocumentationActive ? "default" : "outline"}
                    size="sm"
                    data-testid="dropdown-documentation"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Documentation
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {documentationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => setLocation(item.path)}
                        data-testid={item.testId}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Settings Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/settings")}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* Logout Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
