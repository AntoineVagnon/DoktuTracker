import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DocumentLibraryPanel } from "@/components/DocumentLibraryPanel";
import { FileText, Upload, Plus } from "lucide-react";

export default function DocumentLibrary() {
  const { user } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Please log in to access your document library.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Document Library</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your personal medical documents and attach them to appointments
            </p>
          </div>
          <Button 
            onClick={() => setIsPanelOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Personal Document Library
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Secure Document Storage
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Upload your medical documents securely and attach them to appointments when needed. 
                All documents are HIPAA and GDPR compliant.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => setIsPanelOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Your First Document
                </Button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                What you can do:
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Upload medical documents (PDF, JPG, PNG, GIF, TXT)</li>
                <li>• Organize your personal document library</li>
                <li>• Selectively attach documents to specific appointments</li>
                <li>• Share documents securely with your healthcare providers</li>
                <li>• Download your documents anytime</li>
              </ul>
            </div>

            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                Privacy & Security:
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                All documents are encrypted and stored securely in compliance with HIPAA and GDPR regulations. 
                Only you and authorized healthcare providers can access your documents.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supported File Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { type: "PDF", desc: "Documents" },
                { type: "JPG", desc: "Images" },
                { type: "PNG", desc: "Images" },
                { type: "GIF", desc: "Images" },
                { type: "TXT", desc: "Text files" },
              ].map((fileType) => (
                <div key={fileType.type} className="text-center p-4 border rounded-lg">
                  <Badge variant="secondary" className="mb-2">
                    {fileType.type}
                  </Badge>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {fileType.desc}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Maximum file size: 10MB per document
            </p>
          </CardContent>
        </Card>
      </div>

      <DocumentLibraryPanel 
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      />
    </div>
  );
}