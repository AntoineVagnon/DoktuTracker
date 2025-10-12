import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Link as LinkIcon, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DoctorPhotoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctorId: number;
  currentPhotoUrl?: string;
  doctorName: string;
  onSuccess?: () => void;
}

export default function DoctorPhotoModal({
  open,
  onOpenChange,
  doctorId,
  currentPhotoUrl,
  doctorName,
  onSuccess,
}: DoctorPhotoModalProps) {
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (uploadMode === 'file' && !selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (uploadMode === 'url' && !photoUrl.trim()) {
      alert('Please enter a photo URL');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;

      if (uploadMode === 'file' && selectedFile) {
        // Upload file using FormData
        const formData = new FormData();
        formData.append('photo', selectedFile);

        response = await fetch(`/api/admin/doctors/${doctorId}/photo/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      } else {
        // Use URL
        response = await apiRequest('PATCH', `/api/admin/doctors/${doctorId}/photo`, {
          profileImageUrl: photoUrl.trim(),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to update photo');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating photo:', error);
      alert('Failed to update photo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('PATCH', `/api/admin/doctors/${doctorId}/photo`, {
        profileImageUrl: null,
      });

      if (!response.ok) {
        throw new Error('Failed to remove photo');
      }

      setPhotoUrl('');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Failed to remove photo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoUrl(e.target?.result as string);
        setPreviewError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Unsplash suggestions
  const unsplashExamples = [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1594824309293-e3ed3a647ab7?w=400&h=400&fit=crop&crop=face',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Update Profile Photo
          </DialogTitle>
          <p className="text-sm text-gray-500">For Dr. {doctorName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Photo Preview */}
          <div className="flex justify-center">
            <div className="relative">
              {photoUrl && !previewError ? (
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  onError={() => setPreviewError(true)}
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-gray-200">
                  <User className="h-16 w-16 text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Upload Mode Tabs */}
          <div className="flex gap-2 border-b">
            <button
              type="button"
              onClick={() => {
                setUploadMode('file');
                setPhotoUrl('');
                setSelectedFile(null);
              }}
              className={`px-4 py-2 font-medium ${
                uploadMode === 'file'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload File
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('url');
                setPhotoUrl('');
                setSelectedFile(null);
              }}
              className={`px-4 py-2 font-medium ${
                uploadMode === 'url'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LinkIcon className="h-4 w-4 inline mr-2" />
              Use URL
            </button>
          </div>

          {/* File Upload */}
          {uploadMode === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="photoFile" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Select Image File
              </Label>
              <Input
                id="photoFile"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              <p className="text-xs text-gray-500">
                Upload a profile photo (JPG, PNG, etc. - Max 5MB)
              </p>
              {selectedFile && (
                <p className="text-sm text-green-600">
                  ✓ Selected: {selectedFile.name}
                </p>
              )}
            </div>
          )}

          {/* URL Input */}
          {uploadMode === 'url' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="photoUrl" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Photo URL
                </Label>
                <Input
                  id="photoUrl"
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    setPreviewError(false);
                  }}
                />
                <p className="text-xs text-gray-500">
                  Enter a direct link to an image (JPG, PNG, etc.)
                </p>
              </div>

              {/* Quick Examples */}
              <Alert>
                <Upload className="h-4 w-4" />
                <AlertDescription>
                  <p className="text-sm font-medium mb-2">Quick examples from Unsplash:</p>
                  <div className="space-y-1">
                    {unsplashExamples.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(url);
                          setPreviewError(false);
                        }}
                        className="block w-full text-left text-xs text-blue-600 hover:underline truncate"
                      >
                        {url}
                      </button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            </>
          )}

          {previewError && (
            <Alert variant="destructive">
              <AlertDescription className="text-sm">
                Failed to load image. Please check the URL and try again.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {currentPhotoUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemovePhoto}
                  disabled={isSubmitting}
                >
                  Remove Photo
                </Button>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (uploadMode === 'url' && (!photoUrl.trim() || previewError)) ||
                (uploadMode === 'file' && !selectedFile)
              }
            >
              {isSubmitting ? 'Updating...' : 'Update Photo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
