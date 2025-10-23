import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { getUserRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Edit, Trash2, Shield, Key, Eye, Download, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Role = {
  id: string;
  rbacModelId: string;
  name: string;
  description: string;
  createdAt: string;
};

type Permission = {
  id: string;
  rbacModelId: string;
  name: string;
  description: string;
  createdAt: string;
};

type RbacModel = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
};

export default function AdminRbacDetail() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/admin/rbac/:id");
  const modelId = params?.id;
  const { toast } = useToast();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // State
  const [activeTab, setActiveTab] = useState("roles");
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createPermissionOpen, setCreatePermissionOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deletePermissionId, setDeletePermissionId] = useState<string | null>(null);
  const [assignPermissionsRoleId, setAssignPermissionsRoleId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  
  // Visualization state
  const [viewType, setViewType] = useState<"matrix" | "tree" | "json" | "yaml">("matrix");
  const [searchFilter, setSearchFilter] = useState("");

  // Redirect non-admins
  if (!isAdmin || !modelId) {
    setLocation("/dashboard");
    return null;
  }

  // Queries
  const { data: model } = useQuery<RbacModel>({
    queryKey: ["/api/admin/rbac/models", modelId],
    enabled: isAdmin && !!modelId,
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/rbac/models", modelId, "roles"],
    enabled: isAdmin && !!modelId,
  });

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/admin/rbac/models", modelId, "permissions"],
    enabled: isAdmin && !!modelId,
  });

  const { data: rolePermissions = [] } = useQuery<Permission[]>({
    queryKey: ["/api/admin/rbac/roles", assignPermissionsRoleId, "permissions"],
    enabled: isAdmin && !!assignPermissionsRoleId,
  });

  // Fetch all role-permission mappings for matrix view
  const { data: allRolePermissionMappings = [] } = useQuery<Array<{ roleId: string; permissions: Permission[] }>>({
    queryKey: ["/api/admin/rbac/models", modelId, "role-permission-mappings"],
    queryFn: async () => {
      const mappings = await Promise.all(
        roles.map(async (role) => {
          const response = await fetch(`/api/admin/rbac/roles/${role.id}/permissions`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const permissions = await response.json();
          return { roleId: role.id, permissions };
        })
      );
      return mappings;
    },
    enabled: isAdmin && !!modelId && roles.length > 0,
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", `/api/admin/rbac/models/${modelId}/roles`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "roles"] });
      toast({ title: "Success", description: "Role created successfully" });
      setCreateRoleOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create role", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      return apiRequest("PATCH", `/api/admin/rbac/roles/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "roles"] });
      toast({ title: "Success", description: "Role updated successfully" });
      setEditingRole(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/rbac/roles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "roles"] });
      toast({ title: "Success", description: "Role deleted successfully" });
      setDeleteRoleId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete role", variant: "destructive" });
    },
  });

  const createPermissionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", `/api/admin/rbac/models/${modelId}/permissions`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "permissions"] });
      toast({ title: "Success", description: "Permission created successfully" });
      setCreatePermissionOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create permission", variant: "destructive" });
    },
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      return apiRequest("PATCH", `/api/admin/rbac/permissions/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "permissions"] });
      toast({ title: "Success", description: "Permission updated successfully" });
      setEditingPermission(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update permission", variant: "destructive" });
    },
  });

  const deletePermissionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/rbac/permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models", modelId, "permissions"] });
      toast({ title: "Success", description: "Permission deleted successfully" });
      setDeletePermissionId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete permission", variant: "destructive" });
    },
  });

  const assignPermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      return apiRequest("PUT", `/api/admin/rbac/roles/${roleId}/permissions`, { permissionIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/roles", assignPermissionsRoleId, "permissions"] });
      toast({ title: "Success", description: "Role permissions updated successfully" });
      setAssignPermissionsRoleId(null);
      setSelectedPermissions(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update permissions", variant: "destructive" });
    },
  });

  // Handlers
  const resetForm = () => {
    setFormName("");
    setFormDescription("");
  };

  // Helper function to check if a role has a permission
  const roleHasPermission = (roleId: string, permissionId: string): boolean => {
    const mapping = allRolePermissionMappings.find(m => m.roleId === roleId);
    return mapping?.permissions.some(p => p.id === permissionId) || false;
  };

  // Filter roles and permissions based on search
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    role.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredPermissions = permissions.filter(permission =>
    permission.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    permission.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleCreateRole = () => {
    if (!formName.trim() || !formDescription.trim()) {
      toast({ title: "Validation Error", description: "Name and description are required", variant: "destructive" });
      return;
    }
    createRoleMutation.mutate({ name: formName.trim(), description: formDescription.trim() });
  };

  const handleUpdateRole = () => {
    if (!editingRole || !formName.trim() || !formDescription.trim()) {
      toast({ title: "Validation Error", description: "Name and description are required", variant: "destructive" });
      return;
    }
    updateRoleMutation.mutate({ id: editingRole.id, name: formName.trim(), description: formDescription.trim() });
  };

  const handleCreatePermission = () => {
    if (!formName.trim() || !formDescription.trim()) {
      toast({ title: "Validation Error", description: "Name and description are required", variant: "destructive" });
      return;
    }
    createPermissionMutation.mutate({ name: formName.trim(), description: formDescription.trim() });
  };

  const handleUpdatePermission = () => {
    if (!editingPermission || !formName.trim() || !formDescription.trim()) {
      toast({ title: "Validation Error", description: "Name and description are required", variant: "destructive" });
      return;
    }
    updatePermissionMutation.mutate({ id: editingPermission.id, name: formName.trim(), description: formDescription.trim() });
  };

  const openEditRole = (role: Role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description);
  };

  const openEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setFormName(permission.name);
    setFormDescription(permission.description);
  };

  const openAssignPermissions = (roleId: string) => {
    setAssignPermissionsRoleId(roleId);
    // Will load permissions via query
  };

  // Update selected permissions when role permissions load
  useEffect(() => {
    if (assignPermissionsRoleId && rolePermissions) {
      setSelectedPermissions(new Set(rolePermissions.map(p => p.id)));
    }
  }, [assignPermissionsRoleId, rolePermissions]);

  const togglePermission = (permissionId: string) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(permissionId)) {
      newSet.delete(permissionId);
    } else {
      newSet.add(permissionId);
    }
    setSelectedPermissions(newSet);
  };

  const handleAssignPermissions = () => {
    if (!assignPermissionsRoleId) return;
    assignPermissionsMutation.mutate({
      roleId: assignPermissionsRoleId,
      permissionIds: Array.from(selectedPermissions),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/admin/rbac")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Models
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight" data-testid="text-model-name">
                {model?.name || "Loading..."}
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-model-description">
                {model?.description}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="mr-2 h-4 w-4" />
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" data-testid="tab-permissions">
              <Key className="mr-2 h-4 w-4" />
              Permissions ({permissions.length})
            </TabsTrigger>
            <TabsTrigger value="visualization" data-testid="tab-visualization">
              <Eye className="mr-2 h-4 w-4" />
              Visualization
            </TabsTrigger>
          </TabsList>

          {/* Roles Tab */}
          <TabsContent value="roles" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Roles</h2>
              <Button onClick={() => setCreateRoleOpen(true)} data-testid="button-create-role">
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </Button>
            </div>

            {rolesLoading ? (
              <p className="text-muted-foreground">Loading roles...</p>
            ) : roles.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">No roles defined</p>
                  <p className="text-muted-foreground mb-4">Create your first role to get started</p>
                  <Button onClick={() => setCreateRoleOpen(true)} data-testid="button-create-first-role">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Role
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <Card key={role.id} className="hover-elevate" data-testid={`card-role-${role.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span data-testid={`text-role-name-${role.id}`}>{role.name}</span>
                      </CardTitle>
                      <CardDescription data-testid={`text-role-description-${role.id}`}>
                        {role.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAssignPermissions(role.id)}
                          data-testid={`button-assign-permissions-${role.id}`}
                        >
                          <Key className="mr-2 h-3 w-3" />
                          Permissions
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditRole(role)}
                          data-testid={`button-edit-role-${role.id}`}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteRoleId(role.id)}
                          data-testid={`button-delete-role-${role.id}`}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Permissions</h2>
              <Button onClick={() => setCreatePermissionOpen(true)} data-testid="button-create-permission">
                <Plus className="mr-2 h-4 w-4" />
                Create Permission
              </Button>
            </div>

            {permissionsLoading ? (
              <p className="text-muted-foreground">Loading permissions...</p>
            ) : permissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-1">No permissions defined</p>
                  <p className="text-muted-foreground mb-4">Create your first permission to get started</p>
                  <Button onClick={() => setCreatePermissionOpen(true)} data-testid="button-create-first-permission">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Permission
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {permissions.map((permission) => (
                  <Card key={permission.id} className="hover-elevate" data-testid={`card-permission-${permission.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg" data-testid={`text-permission-name-${permission.id}`}>
                        {permission.name}
                      </CardTitle>
                      <CardDescription data-testid={`text-permission-description-${permission.id}`}>
                        {permission.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditPermission(permission)}
                          data-testid={`button-edit-permission-${permission.id}`}
                        >
                          <Edit className="mr-2 h-3 w-3" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletePermissionId(permission.id)}
                          data-testid={`button-delete-permission-${permission.id}`}
                        >
                          <Trash2 className="mr-2 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Visualization Tab */}
          <TabsContent value="visualization" className="mt-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <h2 className="text-xl font-semibold">RBAC Visualization</h2>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Search roles or permissions..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-64"
                  data-testid="input-search-visualization"
                />
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/admin/rbac/models/${modelId}/export?format=json`, '_blank')}
                  data-testid="button-export-json"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/admin/rbac/models/${modelId}/export?format=yaml`, '_blank')}
                  data-testid="button-export-yaml"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export YAML
                </Button>
              </div>
            </div>

            {/* View Type Selector */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button
                variant={viewType === "matrix" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("matrix")}
                data-testid="button-view-matrix"
              >
                Permission Matrix
              </Button>
              <Button
                variant={viewType === "tree" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("tree")}
                data-testid="button-view-tree"
              >
                Tree View
              </Button>
              <Button
                variant={viewType === "json" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("json")}
                data-testid="button-view-json"
              >
                JSON View
              </Button>
              <Button
                variant={viewType === "yaml" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("yaml")}
                data-testid="button-view-yaml"
              >
                YAML View
              </Button>
            </div>

            {/* View Content */}
            <div data-testid="visualization-content">
              {viewType === "matrix" && (
                <Card>
                  <CardContent className="p-6">
                    {filteredRoles.length === 0 || filteredPermissions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        {searchFilter ? "No matching roles or permissions found" : "Create roles and permissions to view the matrix"}
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="font-semibold">Permission</TableHead>
                              {filteredRoles.map(role => (
                                <TableHead key={role.id} className="text-center font-semibold min-w-32" data-testid={`matrix-header-${role.id}`}>
                                  {role.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPermissions.map(permission => (
                              <TableRow key={permission.id} data-testid={`matrix-row-${permission.id}`}>
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="font-semibold">{permission.name}</div>
                                    <div className="text-sm text-muted-foreground">{permission.description}</div>
                                  </div>
                                </TableCell>
                                {filteredRoles.map(role => (
                                  <TableCell key={role.id} className="text-center" data-testid={`matrix-cell-${role.id}-${permission.id}`}>
                                    {roleHasPermission(role.id, permission.id) ? (
                                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto" data-testid={`matrix-check-${role.id}-${permission.id}`} />
                                    ) : (
                                      <X className="h-5 w-5 text-muted-foreground/30 mx-auto" data-testid={`matrix-x-${role.id}-${permission.id}`} />
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              {viewType === "tree" && (
                <div className="text-muted-foreground text-center py-12">
                  Tree View (Coming next)
                </div>
              )}
              {viewType === "json" && (
                <div className="text-muted-foreground text-center py-12">
                  JSON View (Coming next)
                </div>
              )}
              {viewType === "yaml" && (
                <div className="text-muted-foreground text-center py-12">
                  YAML View (Coming next)
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Role Dialog */}
        <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>
                Define a new role for this RBAC model.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-role-name">Name</Label>
                <Input
                  id="create-role-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Admin, Editor, Viewer"
                  data-testid="input-create-role-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-role-description">Description</Label>
                <Textarea
                  id="create-role-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this role can do..."
                  rows={3}
                  data-testid="input-create-role-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateRoleOpen(false); resetForm(); }} data-testid="button-cancel-create-role">
                Cancel
              </Button>
              <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending} data-testid="button-submit-create-role">
                {createRoleMutation.isPending ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update the role name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role-name">Name</Label>
                <Input
                  id="edit-role-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  data-testid="input-edit-role-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role-description">Description</Label>
                <Textarea
                  id="edit-role-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  data-testid="input-edit-role-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingRole(null); resetForm(); }} data-testid="button-cancel-edit-role">
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending} data-testid="button-submit-edit-role">
                {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Permission Dialog */}
        <Dialog open={createPermissionOpen} onOpenChange={setCreatePermissionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Permission</DialogTitle>
              <DialogDescription>
                Define a new permission for this RBAC model.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-permission-name">Name</Label>
                <Input
                  id="create-permission-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., read:posts, write:posts, delete:users"
                  data-testid="input-create-permission-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-permission-description">Description</Label>
                <Textarea
                  id="create-permission-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this permission grants..."
                  rows={3}
                  data-testid="input-create-permission-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreatePermissionOpen(false); resetForm(); }} data-testid="button-cancel-create-permission">
                Cancel
              </Button>
              <Button onClick={handleCreatePermission} disabled={createPermissionMutation.isPending} data-testid="button-submit-create-permission">
                {createPermissionMutation.isPending ? "Creating..." : "Create Permission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permission Dialog */}
        <Dialog open={!!editingPermission} onOpenChange={(open) => !open && setEditingPermission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
              <DialogDescription>
                Update the permission name and description.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-permission-name">Name</Label>
                <Input
                  id="edit-permission-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  data-testid="input-edit-permission-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-permission-description">Description</Label>
                <Textarea
                  id="edit-permission-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  data-testid="input-edit-permission-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditingPermission(null); resetForm(); }} data-testid="button-cancel-edit-permission">
                Cancel
              </Button>
              <Button onClick={handleUpdatePermission} disabled={updatePermissionMutation.isPending} data-testid="button-submit-edit-permission">
                {updatePermissionMutation.isPending ? "Updating..." : "Update Permission"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Permissions Dialog */}
        <Dialog open={!!assignPermissionsRoleId} onOpenChange={(open) => {
          if (!open) {
            setAssignPermissionsRoleId(null);
            setSelectedPermissions(new Set());
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Permissions to Role</DialogTitle>
              <DialogDescription>
                Select which permissions this role should have.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {permissions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No permissions available. Create permissions first.
                </p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start space-x-3 p-3 rounded-md hover-elevate"
                      data-testid={`assign-permission-${permission.id}`}
                    >
                      <Checkbox
                        id={`perm-${permission.id}`}
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                        data-testid={`checkbox-permission-${permission.id}`}
                      />
                      <div className="flex-1">
                        <Label htmlFor={`perm-${permission.id}`} className="font-medium cursor-pointer">
                          {permission.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAssignPermissionsRoleId(null);
                  setSelectedPermissions(new Set());
                }}
                data-testid="button-cancel-assign"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPermissions}
                disabled={assignPermissionsMutation.isPending}
                data-testid="button-submit-assign"
              >
                {assignPermissionsMutation.isPending ? "Saving..." : "Save Permissions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Role Confirmation */}
        <AlertDialog open={!!deleteRoleId} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Role</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this role? This will also remove all permission assignments for this role.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-role">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteRoleId && deleteRoleMutation.mutate(deleteRoleId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-role"
              >
                {deleteRoleMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Permission Confirmation */}
        <AlertDialog open={!!deletePermissionId} onOpenChange={(open) => !open && setDeletePermissionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Permission</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this permission? This will remove it from all roles.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-permission">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletePermissionId && deletePermissionMutation.mutate(deletePermissionId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-permission"
              >
                {deletePermissionMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
