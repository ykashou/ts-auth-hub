import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getUserRole } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Search, AlertCircle, Shield, Info, AlertTriangle, XCircle, X, RefreshCw, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import type { AuditLog } from "@shared/schema";
import { PageHeader } from "@/components/PageHeader";

const SEVERITY_CONFIG = {
  info: { label: "Info", icon: Info, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  warning: { label: "Warning", icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  error: { label: "Error", icon: XCircle, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  critical: { label: "Critical", icon: AlertCircle, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

// Helper function to convert object to YAML-like format
function toYAML(obj: any, indent = 0): string {
  const spaces = "  ".repeat(indent);
  let yaml = "";

  if (obj === null || obj === undefined) {
    return "null";
  }

  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      yaml += `${spaces}- ${toYAML(item, indent + 1)}\n`;
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === "object" && value !== null) {
        yaml += `${spaces}${key}:\n${toYAML(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${JSON.stringify(value)}\n`;
      }
    });
  }

  return yaml;
}

const REFRESH_INTERVALS: { label: string; value: number | false }[] = [
  { label: "Off", value: false as false },
  { label: "3s", value: 3000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
  { label: "30s", value: 30000 },
  { label: "1m", value: 60000 },
];

export default function AuditLogsPage() {
  const [, navigate] = useLocation();
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | false>(5000);
  const [isPaused, setIsPaused] = useState(false);
  const [savedInterval, setSavedInterval] = useState<number | false>(5000);
  const pageSize = 50;

  // Redirect non-admins to dashboard
  if (!isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const { data: logsData, isLoading } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ["/api/admin/audit-logs", severityFilter, eventFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      });
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (eventFilter !== "all") params.append("event", eventFilter);
      
      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
    refetchInterval: isPaused ? false : refreshInterval,
  });

  const handlePauseToggle = async () => {
    const newPausedState = !isPaused;
    
    if (newPausedState) {
      // Pausing - save current interval and stop refresh
      setSavedInterval(refreshInterval);
      setIsPaused(true);
      
      // Audit log the pause event
      try {
        await fetch("/api/admin/audit-logs/pause", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
      } catch (error) {
        console.error("Failed to log pause event:", error);
      }
    } else {
      // Playing - restore interval
      setIsPaused(false);
      setRefreshInterval(savedInterval);
      
      // Audit log the play/resume event
      try {
        await fetch("/api/admin/audit-logs/resume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        });
      } catch (error) {
        console.error("Failed to log resume event:", error);
      }
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (eventFilter !== "all") params.append("event", eventFilter);

      const response = await fetch(`/api/admin/audit-logs/export/json?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to export logs");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  const filteredLogs = logsData?.logs.filter((log) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(search) ||
      log.actorEmail?.toLowerCase().includes(search) ||
      log.targetName?.toLowerCase().includes(search)
    );
  }) || [];

  const totalPages = Math.ceil((logsData?.total || 0) / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <PageHeader
            title="Audit Logs"
            subtitle="View and export security and activity logs"
            action={
              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePauseToggle}
                  variant="outline"
                  data-testid="button-pause-play"
                  title={isPaused ? "Resume auto-refresh" : "Pause auto-refresh"}
                >
                  {isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" data-testid="button-refresh-rate">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {REFRESH_INTERVALS.find(i => i.value === (isPaused ? savedInterval : refreshInterval))?.label || "Refresh"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Auto-Refresh Rate</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {REFRESH_INTERVALS.map((interval) => (
                      <DropdownMenuItem
                        key={interval.label}
                        onClick={() => {
                          setRefreshInterval(interval.value);
                          setSavedInterval(interval.value);
                        }}
                        data-testid={`refresh-interval-${interval.label}`}
                      >
                        {interval.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  data-testid="button-export-logs"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            }
          />

          <Card data-testid="card-audit-filters">
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter logs by severity, event type, or search term</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-search-logs"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger data-testid="select-severity">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger data-testid="select-event">
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="auth.login">Login</SelectItem>
                    <SelectItem value="auth.logout">Logout</SelectItem>
                    <SelectItem value="auth.register">Registration</SelectItem>
                    <SelectItem value="user.created">User Created</SelectItem>
                    <SelectItem value="user.updated">User Updated</SelectItem>
                    <SelectItem value="user.deleted">User Deleted</SelectItem>
                    <SelectItem value="service.created">Service Created</SelectItem>
                    <SelectItem value="service.updated">Service Updated</SelectItem>
                    <SelectItem value="service.deleted">Service Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-audit-table">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logsData?.total || 0} logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading audit logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No audit logs found</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Target</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => {
                        const severityConfig = SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG];
                        const SeverityIcon = severityConfig.icon;

                        return (
                          <TableRow
                            key={log.id}
                            className="hover-elevate cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                            data-testid={`row-log-${log.id}`}
                          >
                            <TableCell className="text-xs text-muted-foreground" data-testid={`text-timestamp-${log.id}`}>
                              {format(new Date(log.createdAt), "MMM dd, HH:mm:ss")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={severityConfig.className} data-testid={`badge-severity-${log.id}`}>
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {severityConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs" data-testid={`text-event-${log.id}`}>
                              {log.event}
                            </TableCell>
                            <TableCell className="text-sm" data-testid={`text-actor-${log.id}`}>
                              {log.actorEmail || log.actorId || "System"}
                            </TableCell>
                            <TableCell className="max-w-md truncate" data-testid={`text-action-${log.id}`}>
                              {log.action}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-target-${log.id}`}>
                              {log.targetName || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Sidebar Sheet for Log Details */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={SEVERITY_CONFIG[selectedLog.severity as keyof typeof SEVERITY_CONFIG].className}
                  >
                    {SEVERITY_CONFIG[selectedLog.severity as keyof typeof SEVERITY_CONFIG].label}
                  </Badge>
                  {selectedLog.event}
                </SheetTitle>
                <SheetDescription>
                  {format(new Date(selectedLog.createdAt), "PPpp")}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6">
                <Tabs defaultValue="json" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="json" data-testid="tab-json">JSON</TabsTrigger>
                    <TabsTrigger value="yaml" data-testid="tab-yaml">YAML</TabsTrigger>
                  </TabsList>
                  <TabsContent value="json" className="mt-4">
                    <div className="bg-muted rounded-md p-4">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words" data-testid="text-log-json">
                        {JSON.stringify(selectedLog, null, 2)}
                      </pre>
                    </div>
                  </TabsContent>
                  <TabsContent value="yaml" className="mt-4">
                    <div className="bg-muted rounded-md p-4">
                      <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words" data-testid="text-log-yaml">
                        {toYAML(selectedLog)}
                      </pre>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
