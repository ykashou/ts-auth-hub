import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getUserRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type User = {
  id: string;
  email: string | null;
  role: "admin" | "user";
  createdAt: string;
};

export default function AdminUsers() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect non-admins to dashboard
  if (!isAdmin) {
    setLocation("/dashboard");
    return null;
  }

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const handleCopyUUID = (uuid: string) => {
    navigator.clipboard.writeText(uuid);
    toast({
      title: "Copied!",
      description: "UUID copied to clipboard",
    });
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.id.toLowerCase().includes(query) ||
      (user.email && user.email.toLowerCase().includes(query)) ||
      user.role.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all registered users
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "user" : "users"} registered
              </CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-users"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="mt-4 text-sm text-muted-foreground">Loading users...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? "No users found matching your search" : "No users registered yet"}
                </p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>UUID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Services</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                        <TableCell className="font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[200px]" data-testid={`text-uuid-${user.id}`}>
                              {user.id}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCopyUUID(user.id)}
                              data-testid={`button-copy-uuid-${user.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-email-${user.id}`}>
                          {user.email ? (
                            <span className="text-foreground">{user.email}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            data-testid={`badge-role-${user.id}`}
                          >
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-created-${user.id}`}>
                          {format(new Date(user.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-services-${user.id}`}>
                          <span className="text-muted-foreground">0</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
