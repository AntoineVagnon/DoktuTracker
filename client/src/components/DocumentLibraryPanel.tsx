import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, FileText, Paperclip, Trash2, Download } from "lucide-react";
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

  // Fetch user's document library
  const { data: libraryDocuments = [], isLoading: isLoadingLibrary } = useQuery({
    queryKey: ["/api/documents"],
    enabled: !!user && isOpen,
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
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
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

  // Detach/delete document from appointment
  const detachMutation = useMutation({
    mutationFn: async (documentId: string) => {
      if (!appointmentId) throw new Error("No appointment selected");
      
      // First try to detach from appointment
      const response = await apiRequest("DELETE", `/api/appointments/${appointmentId}/documents/${documentId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${appointmentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document removed",
        description: "Document has been removed from this appointment.",
      });
    },
    onError: (error) => {
      console.error("Error removing document:", error);
      toast({
        title: "Error",
        description: "Failed to remove document from appointment.",
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

  // Handle document download - Windows-compatible approach
  const handleDownload = async (doc: any) => {
    try {
      // Direct download approach for Windows compatibility
      // This avoids blob creation which can cause Windows registry errors
      const downloadUrl = `/api/download/${doc.id}`;
      
      // Create a hidden iframe to trigger download without blob
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = downloadUrl;
      document.body.appendChild(iframe);
      
      // Clean up after a delay
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
      
      toast({
        title: "Download started",
        description: `${doc.fileName} is downloading...`,
      });
      
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: `Unable to download document`,
        variant: "destructive",
      });
    }
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
                        onClick={() => detachMutation.mutate(doc.id)}
                        disabled={detachMutation.isPending}
                        title="Remove from appointment"
                      >
                        <X className="h-3 w-3" />
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

        {/* Attach from Library section */}
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
      </div>
    </div>
  );
}