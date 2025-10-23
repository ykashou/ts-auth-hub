import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getUserRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { Search, MoreVertical, Edit, Trash2, Plus, Shield } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Navbar from "@/components/Navbar";

type RbacModel = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
};

export default function AdminRbac() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<RbacModel | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Redirect non-admins to dashboard
  if (!isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const { data: models = [], isLoading } = useQuery<RbacModel[]>({
    queryKey: ["/api/admin/rbac/models"],
    enabled: isAdmin,
  });

  // Create model mutation
  const createModelMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/admin/rbac/models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models"] });
      toast({
        title: "Success",
        description: "RBAC model created successfully",
      });
      setCreateDialogOpen(false);
      setFormName("");
      setFormDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create RBAC model",
        variant: "destructive",
      });
    },
  });

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      return apiRequest("PATCH", `/api/admin/rbac/models/${id}`, { name, description });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models"] });
      toast({
        title: "Success",
        description: "RBAC model updated successfully",
      });
      setEditingModel(null);
      setFormName("");
      setFormDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update RBAC model",
        variant: "destructive",
      });
    },
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/rbac/models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rbac/models"] });
      toast({
        title: "Success",
        description: "RBAC model deleted successfully",
      });
      setDeleteConfirmId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete RBAC model",
        variant: "destructive",
      });
    },
  });

  // Filter models by search
  const filteredModels = useMemo(() => {
    return models.filter(model => 
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [models, searchQuery]);

  const handleCreateModel = () => {
    if (!formName.trim() || !formDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    createModelMutation.mutate({
      name: formName.trim(),
      description: formDescription.trim(),
    });
  };

  const handleUpdateModel = () => {
    if (!editingModel || !formName.trim() || !formDescription.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and description are required",
        variant: "destructive",
      });
      return;
    }

    updateModelMutation.mutate({
      id: editingModel.id,
      name: formName.trim(),
      description: formDescription.trim(),
    });
  };

  const openEditDialog = (model: RbacModel) => {
    setEditingModel(model);
    setFormName(model.name);
    setFormDescription(model.description);
  };

  const closeEditDialog = () => {
    setEditingModel(null);
    setFormName("");
    setFormDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">RBAC Models</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage role-based access control models
            </p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            data-testid="button-create-model"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Model
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Models Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading models...</p>
          </div>
        ) : filteredModels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No RBAC models found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search query" : "Create your first RBAC model to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Model
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((model) => (
              <Card 
                key={model.id} 
                className="hover-elevate active-elevate-2 cursor-pointer transition-all" 
                data-testid={`card-model-${model.id}`}
                onClick={() => setLocation(`/admin/rbac/${model.id}`)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-model-name-${model.id}`}>
                      {model.name}
                    </CardTitle>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        data-testid={`button-menu-${model.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(model);
                        }} 
                        data-testid={`menu-edit-${model.id}`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(model.id);
                        }}
                        className="text-destructive"
                        data-testid={`menu-delete-${model.id}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4" data-testid={`text-model-description-${model.id}`}>
                    {model.description}
                  </CardDescription>
                  <div className="text-xs text-muted-foreground">
                    Created {format(new Date(model.createdAt), "MMM d, yyyy")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Model Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create RBAC Model</DialogTitle>
              <DialogDescription>
                Define a new role-based access control model that can be applied to services.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Standard User Permissions"
                  data-testid="input-create-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this RBAC model is for..."
                  rows={3}
                  data-testid="input-create-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreateDialogOpen(false);
                  setFormName("");
                  setFormDescription("");
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateModel}
                disabled={createModelMutation.isPending}
                data-testid="button-submit-create"
              >
                {createModelMutation.isPending ? "Creating..." : "Create Model"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Model Dialog */}
        <Dialog open={!!editingModel} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit RBAC Model</DialogTitle>
              <DialogDescription>
                Update the name and description of this RBAC model.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Standard User Permissions"
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this RBAC model is for..."
                  rows={3}
                  data-testid="input-edit-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={closeEditDialog}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateModel}
                disabled={updateModelMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateModelMutation.isPending ? "Updating..." : "Update Model"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete RBAC Model</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this RBAC model? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && deleteModelMutation.mutate(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteModelMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
