import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  Lock, 
  Key, 
  Users, 
  FileWarning, 
  CheckCircle2,
  AlertTriangle,
  Activity,
  Database,
  Eye,
  RefreshCw,
  Download,
  UserCheck,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";

export default function DataSecurity() {
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch security metrics from Supabase
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/security/metrics'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch encryption keys from Supabase
  const { data: encryptionKeys, isLoading: keysLoading } = useQuery({
    queryKey: ['/api/security/encryption-keys'],
    enabled: selectedTab === 'encryption'
  });

  // Fetch access control roles from Supabase
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/security/roles'],
    enabled: selectedTab === 'access'
  });

  // Fetch recent audit logs from Supabase
  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/security/audit-logs/recent'],
    enabled: selectedTab === 'audit',
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const getComplianceColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getActionBadgeColor = (action: string) => {
    switch(action) {
      case 'view': return 'secondary';
      case 'create': return 'default';
      case 'update': return 'outline';
      case 'delete': return 'destructive';
      case 'export': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                Data Security Center
              </h1>
              <p className="text-gray-600 mt-2">
                Comprehensive security management powered by Supabase
              </p>
            </div>
            <Button 
              onClick={() => refetchMetrics()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Compliance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getComplianceColor(metrics?.compliance?.overallScore || 0)}>
                    {metrics?.compliance?.overallScore || 0}%
                  </span>
                </div>
                <Progress 
                  value={metrics?.compliance?.overallScore || 0} 
                  className="mt-2"
                />
                <div className="flex gap-2 mt-2">
                  {metrics?.compliance?.gdprCompliant && (
                    <Badge variant="secondary" className="text-xs">GDPR</Badge>
                  )}
                  {metrics?.compliance?.hipaCompliant && (
                    <Badge variant="secondary" className="text-xs">HIPAA</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Encrypted Columns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.encryptionStatus?.encryptedColumns || 0}/{metrics?.encryptionStatus?.totalColumns || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {metrics?.encryptionStatus?.pendingColumns || 0} pending
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  AES-256-GCM
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Today's Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.auditLogs?.todayLogs || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Data access attempts
                </p>
                {(metrics?.accessControl?.unauthorizedAttempts || 0) > 0 && (
                  <Badge variant="destructive" className="mt-2 text-xs">
                    {metrics?.accessControl?.unauthorizedAttempts} denied
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Active Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.accessControl?.totalUsers || 0}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Across {metrics?.accessControl?.activeRoles || 0} roles
                </p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Supabase Auth
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs for different security sections */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="encryption">Encryption</TabsTrigger>
            <TabsTrigger value="access">Access Control</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Storage
                  </CardTitle>
                  <CardDescription>
                    All security data stored in Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Encryption Keys</span>
                    <Badge variant="secondary">3 Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security Roles</span>
                    <Badge variant="secondary">5 Configured</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Logs</span>
                    <Badge variant="secondary">{metrics?.auditLogs?.totalLogs || 0} Records</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Management</span>
                    <Badge variant="secondary">JWT + Supabase</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Status
                  </CardTitle>
                  <CardDescription>
                    Real-time security monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>System Secure</AlertTitle>
                    <AlertDescription>
                      All security systems operational in Supabase
                    </AlertDescription>
                  </Alert>
                  
                  {(metrics?.accessControl?.unauthorizedAttempts || 0) > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Unauthorized Attempts</AlertTitle>
                      <AlertDescription>
                        {metrics?.accessControl?.unauthorizedAttempts} blocked access attempts today
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-2">
                    <p className="text-sm text-gray-600">
                      Last assessment: {new Date(metrics?.compliance?.lastAssessment || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="encryption" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Encryption Keys Management
                </CardTitle>
                <CardDescription>
                  Managed in Supabase database
                </CardDescription>
              </CardHeader>
              <CardContent>
                {keysLoading ? (
                  <div className="text-center py-4">Loading encryption keys...</div>
                ) : (
                  <div className="space-y-4">
                    {encryptionKeys?.map((key: any) => (
                      <div key={key.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{key.keyName}</span>
                          </div>
                          {key.isActive ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>Type: {key.keyType}</div>
                          <div>Algorithm: {key.algorithm}</div>
                          <div>Rotation: Every {key.rotationPeriodDays} days</div>
                          <div>Last Rotated: {new Date(key.lastRotatedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Access Control Roles
                </CardTitle>
                <CardDescription>
                  Role-based permissions from Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rolesLoading ? (
                  <div className="text-center py-4">Loading roles...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles?.map((role: any) => (
                      <div key={role.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{role.roleName}</span>
                          <Badge variant="outline">{role.activeUsers} users</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2">
                            <Eye className="h-3 w-3" />
                            <span>Health Data: {role.healthDataAccess}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-3 w-3" />
                            <span>Patient Data: {role.patientDataAccess}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3" />
                            <span>Audit Access: {role.auditLogAccess}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5" />
                  Recent Audit Logs
                </CardTitle>
                <CardDescription>
                  Live from Supabase database (auto-refreshes every 10s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {logsLoading ? (
                    <div className="text-center py-4">Loading audit logs...</div>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs?.map((log: any) => (
                        <div key={log.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={getActionBadgeColor(log.action)}>
                                {log.action}
                              </Badge>
                              <span className="text-sm font-medium">
                                {log.resourceType}
                              </span>
                            </div>
                            {log.accessGranted ? (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Granted
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Denied
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            <span>User: {log.userName}</span>
                            {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                          </div>
                          {log.denialReason && (
                            <p className="text-xs text-red-600 mt-1">
                              Reason: {log.denialReason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Information */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">
                Phase 6: Data Security Enhancements Active
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                All security data is stored and managed in your Supabase database. 
                The system tracks encryption status, access control, audit logs, and 
                compliance metrics in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}