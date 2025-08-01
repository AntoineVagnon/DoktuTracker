import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DoctorDocumentViewerProps {
  appointmentId: number;
  patientName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function DoctorDocumentViewer({ appointmentId, patientName, isOpen, onClose }: DoctorDocumentViewerProps) {
  const { toast } = useToast();

  // Fetch documents attached to this appointment
  const { data: attachedDocuments = [], isLoading: isLoadingAttached } = useQuery({
    queryKey: [`/api/appointments/${appointmentId}/documents`],
    enabled: !!appointmentId && isOpen,
  });

  // Handle document download
  const handleDownload = async (document: any) => {
    try {
      const response = await fetch(`/api/documents/download/${document.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = document.fileName;
      a.click();
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "Unable to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-lg font-semibold">Patient Documents</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{patientName}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documents for this appointment</CardTitle>
            <p className="text-xs text-gray-500">
              Only documents the patient has shared for this consultation
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoadingAttached ? (
              <div className="text-sm text-gray-500">Loading documents...</div>
            ) : (attachedDocuments as any[]).length > 0 ? (
              (attachedDocuments as any[]).map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block" title={doc.fileName}>
                        {doc.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {doc.documentType} • {Math.round(doc.fileSize / 1024)} KB
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    title="Download document"
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No documents shared for this appointment</p>
                <p className="text-xs mt-1">The patient hasn't attached any documents yet</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Information note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Privacy Note:</strong> You can only view documents the patient has explicitly shared for this appointment. 
            Their personal document library remains private.
          </p>
        </div>
      </div>
    </div>
  );
}