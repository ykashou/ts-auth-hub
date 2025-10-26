import { Button } from "@/components/ui/button";
import { Shield, Boxes, Settings2, FileText, Code2, LogOut, Home, Users, ShieldCheck, ChevronDown, Globe, Layout } from "lucide-react";
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

  const handleLogout = () => {
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
    { path: "/admin/role-assignments", label: "Role Assignments", icon: ShieldCheck, testId: "button-role-assignments" },
  ];

  const serviceManagementItems = [
    { path: "/services", label: "Services", icon: Boxes, testId: "button-services" },
    { path: "/config", label: "Config", icon: Settings2, testId: "button-config" },
    { path: "/admin/global-services", label: "Global Services", icon: Globe, testId: "button-global-services" },
    { path: "/admin/login-editor", label: "Login Editor", icon: Layout, testId: "button-login-editor" },
  ];

  const documentationItems = [
    { path: "/api-docs", label: "API Docs", icon: FileText, testId: "button-api-docs" },
    { path: "/widget-docs", label: "Widget", icon: Code2, testId: "button-widget-docs" },
  ];

  const isUserManagementActive = userManagementItems.some(item => location === item.path);
  const isServiceManagementActive = serviceManagementItems.some(item => location === item.path);
  const isDocumentationActive = documentationItems.some(item => location === item.path);

  return (
    <header className="bg-card border-b border-border sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
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

            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
