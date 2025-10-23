import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Copy, CheckCircle2, Loader2, Users, UserCheck, 
  UserPlus, Shield, Settings, FileText, Box, Code, TrendingUp,
  Calendar, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAuthenticated } from "@/lib/auth";
import { useLocation } from "wouter";
import type { User, Service } from "@shared/schema";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated()) {
      setLocation("/login");
    }
  }, [setLocation]);

  if (!isAuthenticated()) {
    return null;
  }

  // Fetch current user's information
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/me"],
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  // Calculate metrics
  const totalUsers = users.length;
  const authenticatedUsers = users.filter(u => u.email).length;
  const anonymousUsers = users.filter(u => !u.email).length;
  const recentUsers = users.filter(u => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(u.createdAt) >= sevenDaysAgo;
  }).length;

  const filteredUsers = users.filter(
    (user) =>
      (user.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "Copied to clipboard",
      description: "UUID has been copied successfully",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor user activity and system overview
              </p>
            </div>
          </div>

          {/* Current User Account Info */}
          {currentUser && (
            <Card className="border-primary/50" data-testid="card-current-user">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Your Account
                </CardTitle>
                <CardDescription>
                  {currentUser.email ? 'Your account information' : '⚠️ Save your UUID - this is your only way to log back in!'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">User ID (UUID)</p>
                  <div className="flex items-center gap-2">
                    <code 
                      className="flex-1 text-sm font-mono bg-muted p-2 rounded border select-all" 
                      data-testid="text-current-user-id"
                    >
                      {currentUser.id}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(currentUser.id, 'current-user')}
                      data-testid="button-copy-current-user-id"
                    >
                      {copiedId === 'current-user' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                {currentUser.email && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Email</p>
                    <p className="text-sm" data-testid="text-current-user-email">{currentUser.email}</p>
                  </div>
                )}
                {!currentUser.email && (
                  <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-lg">
                    <p className="text-xs text-destructive font-semibold">
                      ⚠️ Anonymous Account - Important!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You are logged in with a UUID-only account. Copy and save your UUID above - you'll need it to log back in. 
                      There is no password recovery for anonymous accounts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-total-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All registered accounts
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-authenticated-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Authenticated</CardTitle>
                <UserCheck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{authenticatedUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  With email & password
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-anonymous-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Anonymous</CardTitle>
                <Shield className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{anonymousUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  UUID-only accounts
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-users">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{recentUsers}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  New registrations
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Metrics & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Service Stats */}
            <Card data-testid="card-services">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Configured Services</CardTitle>
                <Box className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{services.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active service cards
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => setLocation("/config")}
                  data-testid="button-manage-services"
                >
                  <Settings className="w-3 h-3 mr-2" />
                  Manage Services
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-2" data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                <CardDescription className="text-xs">
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setLocation("/config")}
                    data-testid="button-add-service"
                  >
                    <Box className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setLocation("/widget-docs")}
                    data-testid="button-widget-docs"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    Widget Integration
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setLocation("/api-docs")}
                    data-testid="button-api-docs"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    API Documentation
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => setLocation("/services")}
                    data-testid="button-view-services"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    View Services
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          {users.length > 0 && (
            <Card data-testid="card-recent-activity">
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Recent Registrations
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest user accounts created
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...users]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((user) => (
                      <div 
                        key={user.id} 
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        data-testid={`recent-user-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            {user.email ? (
                              <UserCheck className="w-4 h-4 text-primary" />
                            ) : (
                              <Shield className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {user.email || <span className="italic text-muted-foreground">Anonymous User</span>}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {user.id.slice(0, 13)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">All Users</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Complete user directory with search and UUID management
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by email or UUID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin" />
                  <p>Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "New users will appear here after registration"}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">UUID</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Type</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground truncate max-w-[200px]">
                                {user.id}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyToClipboard(user.id, user.id)}
                                data-testid={`button-copy-${user.id}`}
                              >
                                {copiedId === user.id ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-email-${user.id}`}>
                            {user.email || <span className="text-muted-foreground italic">Anonymous</span>}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.email ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {user.email ? "Authenticated" : "Anonymous"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <div>
                              <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs">
                                {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(user.id, `view-${user.id}`)}
                              data-testid={`button-view-${user.id}`}
                            >
                              {copiedId === `view-${user.id}` ? "Copied!" : "Copy UUID"}
                            </Button>
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
      </main>
    </div>
  );
}
