import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Paperclip, Trash2, Download, Archive } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

interface DocumentLibraryPanelProps {
  appointmentId?: number;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentLibraryPanel({ appointmentId, isOpen, onClose }: DocumentLibraryPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("library");

  // Fetch user's document library (only for non-doctors)
  const { data: libraryDocuments = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ["/api/documents"],
    enabled: !!user && isOpen && user?.role !== 'doctor',
  });

  // Fetch documents attached to this appointment (if appointmentId provided)
  const { data: attachedDocuments = [], isLoading: isLoadingAttached } = useQuery({
    queryKey: [`/api/documents/${appointmentId}`],
    enabled: !!appointmentId && isOpen,
  });

  // Handle direct file upload without cloud storage
  const handleDirectFileUpload = async (file: File, documentType: 'appointment-only' | 'library') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      if (documentType === 'appointment-only' && appointmentId) {
        formData.append('appointmentId', appointmentId.toString());
      }

      // Get auth token from localStorage
      const authData = localStorage.getItem('doktu_auth');
      const token = authData ? JSON.parse(authData).session?.access_token : null;

      // Use VITE_API_URL for cross-domain requests
      // Force Railway URL in production
      const apiUrl = import.meta.env.VITE_API_URL ||
        (import.meta.env.PROD ? 'https://web-production-b2ce.up.railway.app' : '');
      const fullUrl = `${apiUrl}/api/documents/upload`;

      console.log('📤 [LIBRARY-PANEL] Uploading document with auth token:', token ? 'Present' : 'Missing');
      console.log('📤 [LIBRARY-PANEL] API URL:', apiUrl);
      console.log('📤 [LIBRARY-PANEL] Full URL:', fullUrl);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      // Refresh appropriate document lists
      if (documentType === 'appointment-only' && appointmentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      }
      
      toast({
        title: "Document uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });
      
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    }
  };


  // Attach document to appointment
  const attachMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!appointmentId) throw new Error("No appointment selected");
      
      return apiRequest("POST", `/api/appointments/${appointmentId}/documents/attach`, {
        documentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      toast({
        title: "Document attached",
        description: "Document has been attached to this appointment.",
      });
    },
    onError: (error) => {
      console.error("Error attaching document:", error);
      toast({
        title: "Error",
        description: "Failed to attach document to appointment.",
        variant: "destructive",
      });
    },
  });

  // Permanently delete document from appointment
  const permanentDeleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document deleted",
        description: "Document has been permanently deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  // Import document to library
  const importToLibraryMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("POST", `/api/documents/${documentId}/import`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document imported",
        description: "Document has been imported to your library for reuse.",
      });
    },
    onError: (error) => {
      console.error("Error importing document:", error);
      toast({
        title: "Error",
        description: "Failed to import document to library.",
        variant: "destructive",
      });
    },
  });

  // Delete document from library
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (appointmentId) {
        queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      }
      toast({
        title: "Document deleted",
        description: "Document has been permanently deleted from your library.",
      });
    },
    onError: (error) => {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  // Handle document download - Direct navigation approach
  const handleDownload = (doc: any) => {
    // Most direct approach - let browser handle download natively
    // This works best in all environments including Replit dev mode
    window.location.href = `/api/download/${doc.id}`;
    
    toast({
      title: "Download started",
      description: `${doc.fileName} is downloading...`,
    });
  };

  if (!isOpen) return null;

  // Get documents available for attachment (library docs not already attached)
  const attachedDocumentIds = new Set((attachedDocuments as any[]).map((doc: any) => doc.id));
  const availableForAttachment = (libraryDocuments as any[]).filter((doc: any) => !attachedDocumentIds.has(doc.id));

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold">Document Library</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Files for this appointment section */}
        {appointmentId && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Files for this appointment</CardTitle>
              <div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleDirectFileUpload(file, 'appointment-only');
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                  id="appointment-file-input"
                />
                <Button
                  onClick={() => document.getElementById('appointment-file-input')?.click()}
                  className="h-8 px-3 text-xs"
                >
                  <span>Upload</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingAttached ? (
                <div className="text-sm text-gray-500">Loading...</div>
              ) : (attachedDocuments as any[]).length > 0 ? (
                (attachedDocuments as any[]).map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm truncate" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => importToLibraryMutation.mutate(doc.id)}
                        disabled={importToLibraryMutation.isPending}
                        title="Import to library for reuse"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to permanently delete this document?")) {
                            permanentDeleteMutation.mutate(doc.id);
                          }
                        }}
                        disabled={permanentDeleteMutation.isPending}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">
                  No documents attached to this appointment
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attach from Library section - Only show to patients */}
        {user?.role !== 'doctor' && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Attach from Library</CardTitle>
            <div>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleDirectFileUpload(file, 'library');
                    e.target.value = '';
                  }
                }}
                className="hidden"
                id="library-file-input"
              />
              <Button
                onClick={() => document.getElementById('library-file-input')?.click()}
                className="h-8 px-3 text-xs"
              >
                <span>Upload</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingLibrary ? (
              <div className="text-sm text-gray-500">Loading library...</div>
            ) : availableForAttachment.length > 0 ? (
              availableForAttachment.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded-lg">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm truncate" title={doc.fileName}>
                      {doc.fileName}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    {appointmentId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => attachMutation.mutate(doc.id)}
                        disabled={attachMutation.isPending}
                        title="Attach to appointment"
                      >
                        <Paperclip className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this document permanently?")) {
                          deleteMutation.mutate(doc.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      title="Delete forever"
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">
                No documents available to attach
              </div>
            )}
            
            <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                📁 Documents uploaded here are saved to your library for reuse across appointments
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
}