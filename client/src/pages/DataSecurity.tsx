import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, Lock, Key, AlertTriangle, CheckCircle, 
  RefreshCw, Eye, FileText, Users, Activity,
  ShieldCheck, ShieldAlert, Database, Server
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

interface SecurityMetrics {
  encryptionStatus: {
    totalColumns: number;
    encryptedColumns: number;
    pendingColumns: number;
    lastRotation: string;
  };
  accessControl: {
    totalUsers: number;
    activeRoles: number;
    recentAccessAttempts: number;
    unauthorizedAttempts: number;
  };
  auditLogs: {
    totalLogs: number;
    todayLogs: number;
    criticalEvents: number;
    lastAuditTime: string;
  };
  compliance: {
    gdprCompliant: boolean;
    hipaCompliant: boolean;
    lastAssessment: string;
    overallScore: number;
  };
}

interface EncryptionKey {
  id: string;
  keyName: string;
  keyType: string;
  algorithm: string;
  rotationPeriodDays: number;
  lastRotatedAt: string;
  isActive: boolean;
}

interface AccessControlRole {
  id: string;
  roleName: string;
  description: string;
  healthDataAccess: string;
  adminFunctions: string;
  patientDataAccess: string;
  auditLogAccess: string;
  activeUsers: number;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  resourceType: string;
  action: string;
  accessGranted: boolean;
  denialReason?: string;
  timestamp: string;
  ipAddress: string;
}

export default function DataSecurity() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedKey, setSelectedKey] = useState<EncryptionKey | null>(null);

  // Fetch security metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<SecurityMetrics>({
    queryKey: ['/api/security/metrics'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch encryption keys
  const { data: encryptionKeys, isLoading: keysLoading } = useQuery<EncryptionKey[]>({
    queryKey: ['/api/security/encryption-keys'],
  });

  // Fetch access control roles
  const { data: roles, isLoading: rolesLoading } = useQuery<AccessControlRole[]>({
    queryKey: ['/api/security/roles'],
  });

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ['/api/security/audit-logs/recent'],
  });

  const encryptionProgress = metrics 
    ? (metrics.encryptionStatus.encryptedColumns / metrics.encryptionStatus.totalColumns) * 100 
    : 0;

  const complianceScore = metrics?.compliance.overallScore || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Data Security Center
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive security management for health data protection
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Run Security Audit
        </Button>
      </div>

      {/* Security Status Alert */}
      {metrics && metrics.accessControl.unauthorizedAttempts > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            {metrics.accessControl.unauthorizedAttempts} unauthorized access attempts detected in the last 24 hours.
            Review audit logs for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Encryption Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {Math.round(encryptionProgress)}%
                  </span>
                  <Lock className="h-5 w-5 text-green-600" />
                </div>
                <Progress value={encryptionProgress} className="h-2" />
                <p className="text-xs text-gray-500">
                  {metrics.encryptionStatus.encryptedColumns} of {metrics.encryptionStatus.totalColumns} columns
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Access Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.accessControl.totalUsers}
                  </span>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500">
                  Active users across {metrics.accessControl.activeRoles} roles
                </p>
                {metrics.accessControl.unauthorizedAttempts > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {metrics.accessControl.unauthorizedAttempts} blocked
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Audit Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {metrics.auditLogs.todayLogs}
                  </span>
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500">
                  Events logged today
                </p>
                {metrics.auditLogs.criticalEvents > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {metrics.auditLogs.criticalEvents} critical
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Compliance Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {complianceScore}%
                  </span>
                  {complianceScore >= 90 ? (
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  ) : (
                    <ShieldAlert className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex gap-2">
                  {metrics.compliance.gdprCompliant && (
                    <Badge variant="outline" className="text-xs">GDPR</Badge>
                  )}
                  {metrics.compliance.hipaCompliant && (
                    <Badge variant="outline" className="text-xs">HIPAA</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Status Overview</CardTitle>
              <CardDescription>
                Real-time monitoring of security measures and compliance status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Data Encryption Status
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Health Records</span>
                      <Badge className="bg-green-100 text-green-800">AES-256-GCM</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Personal Data</span>
                      <Badge className="bg-green-100 text-green-800">AES-256-GCM</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Video Consultations</span>
                      <Badge className="bg-green-100 text-green-800">WebRTC-DTLS-SRTP</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Data in Transit</span>
                      <Badge className="bg-green-100 text-green-800">TLS 1.3</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Infrastructure Security
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Session Management</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">JWT Token Security</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Row-Level Security</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Audit Logging</span>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encryption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encryption Key Management</CardTitle>
              <CardDescription>
                Manage encryption keys and rotation schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {encryptionKeys?.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedKey(key)}
                    >
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-gray-600" />
                        <div>
                          <p className="font-medium">{key.keyName}</p>
                          <p className="text-sm text-gray-500">
                            {key.algorithm} • {key.keyType}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={key.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4" />
                          Rotate
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedKey && (
            <Card>
              <CardHeader>
                <CardTitle>Key Details: {selectedKey.keyName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Algorithm</p>
                    <p className="font-medium">{selectedKey.algorithm}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium">{selectedKey.keyType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rotation Period</p>
                    <p className="font-medium">{selectedKey.rotationPeriodDays} days</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Last Rotated</p>
                    <p className="font-medium">
                      {new Date(selectedKey.lastRotatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="access-control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Based Access Control</CardTitle>
              <CardDescription>
                Manage user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {roles?.map((role) => (
                    <div key={role.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold capitalize">{role.roleName}</h3>
                          <p className="text-sm text-gray-500">{role.description}</p>
                        </div>
                        <Badge variant="outline">{role.activeUsers} users</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Health Data:</span>{' '}
                          <span className="font-medium">{role.healthDataAccess}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Admin:</span>{' '}
                          <span className="font-medium">{role.adminFunctions}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Patient Data:</span>{' '}
                          <span className="font-medium">{role.patientDataAccess}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Audit Logs:</span>{' '}
                          <span className="font-medium">{role.auditLogAccess}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Logs</CardTitle>
              <CardDescription>
                Track all data access and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {logsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs?.map((log) => (
                      <div
                        key={log.id}
                        className={`p-3 border rounded-lg ${
                          !log.accessGranted ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {log.accessGranted ? (
                              <Eye className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                {log.userName} • {log.action} {log.resourceType}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleString()} • IP: {log.ipAddress}
                              </p>
                              {log.denialReason && (
                                <p className="text-xs text-red-600 mt-1">
                                  Denied: {log.denialReason}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className={log.accessGranted ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {log.accessGranted ? "Granted" : "Denied"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}