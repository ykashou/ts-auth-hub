import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import { Plus, Trash2, ShieldCheck, User as UserIcon, Box, Search } from "lucide-react";
import type { User, Service, Role, UserServiceRole } from "@shared/schema";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/PageHeader";

// Extended types for joined data
interface UserServiceRoleWithDetails extends UserServiceRole {
  user?: User;
  service?: Service;
  role?: Role;
}

export default function AdminRoleAssignments() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterServiceId, setFilterServiceId] = useState<string>("all");
  const [filterRoleId, setFilterRoleId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Check authentication and admin role
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
    } else if (getUserRole() !== "admin") {
      navigate("/dashboard");
    }
  }, [navigate]);

  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated() && getUserRole() === "admin",
  });

  // Fetch all services (admin view)
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/services/admin"],
    enabled: isAuthenticated() && getUserRole() === "admin",
  });

  // Fetch all RBAC models
  const { data: rbacModels = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/rbac/models"],
    enabled: isAuthenticated() && getUserRole() === "admin",
  });

  // Fetch roles for selected service's RBAC model
  const selectedService = services.find(s => s.id === selectedServiceId);
  const { data: serviceRbacModel } = useQuery<any>({
    queryKey: ["/api/services", selectedServiceId, "rbac-model"],
    enabled: !!selectedServiceId,
  });

  const { data: availableRoles = [] } = useQuery<Role[]>({
    queryKey: ["/api/admin/rbac/models", serviceRbacModel?.id, "roles"],
    enabled: !!serviceRbacModel?.id,
  });

  // Fetch all roles from all RBAC models for enrichment and filtering
  const roleQueriesResults = useQuery({
    queryKey: ["/api/admin/rbac/all-roles"],
    queryFn: async () => {
      const allRoles: Role[] = [];
      for (const model of rbacModels) {
        try {
          const roles = await apiRequest("GET", `/api/admin/rbac/models/${model.id}/roles`);
          allRoles.push(...roles);
        } catch (error) {
          console.error(`Failed to fetch roles for model ${model.id}:`, error);
        }
      }
      return allRoles;
    },
    enabled: rbacModels.length > 0,
  });

  const allRoles = roleQueriesResults.data || [];

  // Fetch all user service roles (always fetch)
  const { data: globalAssignments = [] } = useQuery<UserServiceRole[]>({
    queryKey: ["/api/admin/user-service-roles"],
    enabled: isAuthenticated() && getUserRole() === "admin",
  });

  // Fetch user service roles for a specific user (if filtered)
  const { data: userRoleAssignments = [] } = useQuery<UserServiceRole[]>({
    queryKey: ["/api/admin/users", filterUserId, "service-roles"],
    enabled: filterUserId !== "all",
  });

  // Fetch service user roles for a specific service (if filtered)
  const { data: serviceRoleAssignments = [] } = useQuery<UserServiceRole[]>({
    queryKey: ["/api/admin/services", filterServiceId, "user-roles"],
    enabled: filterServiceId !== "all" && filterUserId === "all",
  });

  // Determine which assignments to display based on filters
  const allAssignments = filterUserId !== "all" 
    ? userRoleAssignments 
    : filterServiceId !== "all"
    ? serviceRoleAssignments
    : globalAssignments;

  // Enrich assignments with user, service, and role details
  let enrichedAssignments: UserServiceRoleWithDetails[] = allAssignments.map(assignment => {
    const user = users.find(u => u.id === assignment.userId);
    const service = services.find(s => s.id === assignment.serviceId);
    const role = allRoles.find(r => r.id === assignment.roleId);
    return {
      ...assignment,
      user,
      service,
      role,
    };
  });

  // Apply role filter
  if (filterRoleId !== "all") {
    enrichedAssignments = enrichedAssignments.filter(a => a.roleId === filterRoleId);
  }

  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    enrichedAssignments = enrichedAssignments.filter(assignment => {
      const userEmail = assignment.user?.email?.toLowerCase() || "";
      const userId = assignment.userId.toLowerCase();
      const serviceName = assignment.service?.name?.toLowerCase() || "";
      const roleName = assignment.role?.name?.toLowerCase() || "";
      const roleDescription = assignment.role?.description?.toLowerCase() || "";
      
      return userEmail.includes(query) || 
             userId.includes(query) ||
             serviceName.includes(query) ||
             roleName.includes(query) ||
             roleDescription.includes(query);
    });
  }

  // Mutation to assign user to role
  const assignMutation = useMutation({
    mutationFn: async ({ userId, serviceId, roleId }: { userId: string; serviceId: string; roleId: string }) => {
      return await apiRequest("POST", "/api/admin/user-service-roles", { userId, serviceId, roleId });
    },
    onSuccess: () => {
      // Invalidate global assignments list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-service-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/all-roles"] });
      if (filterUserId !== "all") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", filterUserId, "service-roles"] });
      }
      if (filterServiceId !== "all") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services", filterServiceId, "user-roles"] });
      }
      toast({
        title: "Success",
        description: "User assigned to role successfully",
      });
      setIsAssignDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign user to role",
        variant: "destructive",
      });
    },
  });

  // Mutation to remove user from role
  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return await apiRequest("DELETE", `/api/admin/user-service-roles/${assignmentId}`);
    },
    onSuccess: () => {
      // Invalidate global assignments list
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-service-roles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/all-roles"] });
      if (filterUserId !== "all") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/users", filterUserId, "service-roles"] });
      }
      if (filterServiceId !== "all") {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/services", filterServiceId, "user-roles"] });
      }
      toast({
        title: "Success",
        description: "User role assignment removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role assignment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedServiceId("");
    setSelectedRoleId("");
  };

  const handleAssign = () => {
    if (!selectedUserId || !selectedServiceId || !selectedRoleId) {
      toast({
        title: "Validation Error",
        description: "Please select user, service, and role",
        variant: "destructive",
      });
      return;
    }

    assignMutation.mutate({
      userId: selectedUserId,
      serviceId: selectedServiceId,
      roleId: selectedRoleId,
    });
  };

  const handleRemove = (assignmentId: string) => {
    if (confirm("Are you sure you want to remove this role assignment?")) {
      removeMutation.mutate(assignmentId);
    }
  };

  if (!isAuthenticated() || getUserRole() !== "admin") {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
      <PageHeader 
        title="Role Assignments"
        subtitle="Assign users to roles within services"
        action={
          <Button
            onClick={() => setIsAssignDialogOpen(true)}
            data-testid="button-add-assignment"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Role
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-services">{services.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-assignments">
              {enrichedAssignments.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search</CardTitle>
          <CardDescription>Search across users, services, and roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user email, service name, or role name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter role assignments by user, service, or role</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by User</label>
            <Select value={filterUserId} onValueChange={setFilterUserId}>
              <SelectTrigger data-testid="select-filter-user">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                    {user.email || user.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Service</label>
            <Select 
              value={filterServiceId} 
              onValueChange={setFilterServiceId}
              disabled={filterUserId !== "all"}
            >
              <SelectTrigger data-testid="select-filter-service">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id} data-testid={`option-service-${service.id}`}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Filter by Role</label>
            <Select value={filterRoleId} onValueChange={setFilterRoleId}>
              <SelectTrigger data-testid="select-filter-role">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {allRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id} data-testid={`option-role-${role.id}`}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Assignments ({enrichedAssignments.length})</CardTitle>
          <CardDescription>
            {searchQuery.trim() 
              ? `Showing ${enrichedAssignments.length} assignments matching "${searchQuery}"`
              : filterUserId !== "all" 
              ? `Showing assignments for ${users.find(u => u.id === filterUserId)?.email || "selected user"}`
              : filterServiceId !== "all"
              ? `Showing assignments for ${services.find(s => s.id === filterServiceId)?.name || "selected service"}`
              : filterRoleId !== "all"
              ? `Showing assignments for role: ${allRoles.find(r => r.id === filterRoleId)?.name || "selected role"}`
              : `Showing all ${enrichedAssignments.length} assignments`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enrichedAssignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No role assignments found</p>
              <p className="text-sm mt-2">Select a filter or create a new assignment</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enrichedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`assignment-${assignment.id}`}
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium" data-testid={`assignment-user-${assignment.id}`}>
                        {assignment.user?.email || assignment.userId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Box className="w-4 h-4" />
                      <span data-testid={`assignment-service-${assignment.id}`}>
                        {assignment.service?.name || assignment.serviceId}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      <span className="font-medium" data-testid={`assignment-role-${assignment.id}`}>
                        {assignment.role?.name || assignment.roleId}
                      </span>
                      {assignment.role?.description && (
                        <span className="text-xs text-muted-foreground">
                          - {assignment.role.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemove(assignment.id)}
                    disabled={removeMutation.isPending}
                    data-testid={`button-remove-${assignment.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent data-testid="dialog-assign-role">
          <DialogHeader>
            <DialogTitle>Assign User to Role</DialogTitle>
            <DialogDescription>
              Assign a user to a specific role within a service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-user">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} data-testid={`option-user-${user.id}`}>
                      {user.email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                <SelectTrigger data-testid="select-service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id} data-testid={`option-service-${service.id}`}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedServiceId && !serviceRbacModel && (
                <p className="text-sm text-amber-600">
                  This service has no RBAC model assigned. Assign one first from the Config page.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select 
                value={selectedRoleId} 
                onValueChange={setSelectedRoleId}
                disabled={!serviceRbacModel || availableRoles.length === 0}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id} data-testid={`option-role-${role.id}`}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedServiceId && availableRoles.length === 0 && serviceRbacModel && (
                <p className="text-sm text-amber-600">
                  No roles available in this service's RBAC model.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                resetForm();
              }}
              data-testid="button-cancel-assignment"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={assignMutation.isPending || !selectedUserId || !selectedServiceId || !selectedRoleId}
              data-testid="button-submit-assignment"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
