import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import DashboardPage from "@/pages/dashboard";
import ApiDocsPage from "@/pages/api-docs";
import ServicesPage from "@/pages/services";
import ConfigPage from "@/pages/config";
import WidgetLoginPage from "@/pages/widget-login";
import WidgetDocsPage from "@/pages/widget-docs";
import AdminUsersPage from "@/pages/admin-users";
import AdminRbacPage from "@/pages/admin-rbac";
import AdminRbacDetailPage from "@/pages/admin-rbac-detail";
import AdminRoleAssignmentsPage from "@/pages/admin-role-assignments";
import AdminGlobalServicesPage from "@/pages/admin-global-services";
import AdminLoginEditorPage from "@/pages/admin/login-editor";
import AdminLoginConfigsPage from "@/pages/admin/login-configs";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/login" />} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/rbac/:id" component={AdminRbacDetailPage} />
      <Route path="/admin/rbac" component={AdminRbacPage} />
      <Route path="/admin/role-assignments" component={AdminRoleAssignmentsPage} />
      <Route path="/admin/global-services" component={AdminGlobalServicesPage} />
      <Route path="/admin/login-editor/:configId" component={AdminLoginEditorPage} />
      <Route path="/admin/login-editor" component={AdminLoginEditorPage} />
      <Route path="/admin/login-configs" component={AdminLoginConfigsPage} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/config" component={ConfigPage} />
      <Route path="/api-docs" component={ApiDocsPage} />
      <Route path="/widget-login" component={WidgetLoginPage} />
      <Route path="/widget-docs" component={WidgetDocsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
