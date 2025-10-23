import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isAuthenticated, getUserRole } from "@/lib/auth";
import { Plus, Trash2, ShieldCheck, User as UserIcon, Box } from "lucide-react";
import type { User, Service, Role, UserServiceRole } from "@shared/schema";

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
  const enrichedAssignments: UserServiceRoleWithDetails[] = allAssignments.map(assignment => {
    const user = users.find(u => u.id === assignment.userId);
    const service = services.find(s => s.id === assignment.serviceId);
    // We need to fetch the role separately - for now just include the IDs
    return {
      ...assignment,
      user,
      service,
    };
  });

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
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight" data-testid="heading-role-assignments">
            Role Assignments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign users to roles within services
          </p>
        </div>
        <Button
          onClick={() => setIsAssignDialogOpen(true)}
          data-testid="button-add-assignment"
        >
          <Plus className="w-4 h-4 mr-2" />
          Assign Role
        </Button>
      </div>

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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter role assignments by user or service</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by User</label>
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

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filter by Service</label>
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
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Assignments</CardTitle>
          <CardDescription>
            {filterUserId !== "all" 
              ? `Showing assignments for ${users.find(u => u.id === filterUserId)?.email || "selected user"}`
              : filterServiceId !== "all"
              ? `Showing assignments for ${services.find(s => s.id === filterServiceId)?.name || "selected service"}`
              : "Select a user or service to view assignments"}
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
                      <ShieldCheck className="w-4 h-4" />
                      <span data-testid={`assignment-role-${assignment.id}`}>
                        Role ID: {assignment.roleId}
                      </span>
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
  );
}
