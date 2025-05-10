import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Paperclip, FileText, X, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AttachmentUploaderProps {
  entityType?: 'income' | 'expense';
  entityId?: number;
  attachmentId?: number | null;
  setAttachmentId?: React.Dispatch<React.SetStateAction<number | null>>;
  attachmentFile?: File | null;
  setAttachmentFile?: React.Dispatch<React.SetStateAction<File | null>>;
  onAttachmentUploaded?: (attachmentId: number) => void;
  onFileSelected?: (file: File | null) => void;
  className?: string;
}

interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: string;
  uploadedBy: number;
}

export function AttachmentUploader({ 
  entityType, 
  entityId, 
  attachmentId, 
  setAttachmentId,
  attachmentFile,
  setAttachmentFile,
  onAttachmentUploaded,
  onFileSelected,
  className
}: AttachmentUploaderProps) {
  const [file, setFile] = useState<File | null>(attachmentFile || null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingAttachment, setExistingAttachment] = useState<Attachment | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log("Uploading attachment:", 
        formData.get('file'), 
        formData.get('entityType'), 
        formData.get('entityId')
      );
      
      try {
        const res = await apiRequest('POST', '/api/attachments', formData, {
          isFormData: true
        });
        
        // Check if response is ok
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
        // Parse response
        const data = await res.json();
        console.log("Upload response:", data);
        return data;
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Upload success, data:", data);
      toast({
        title: "Success",
        description: "Attachment uploaded successfully",
      });
      setFile(null);
      setIsUploading(false);
      setExistingAttachment(data);
      
      if (onAttachmentUploaded && data.id) {
        onAttachmentUploaded(data.id);
      }
      
      // If this is attached to an existing entity, refresh the entity data
      if (entityId) {
        const queryKey = entityType === 'income' ? 
          ['/api/incomes', entityId] : 
          ['/api/expenses', entityId];
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      console.error("Upload error in mutation:", error);
      toast({
        title: "Error",
        description: `Failed to upload attachment: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  // Fetch existing attachment if there's an attachmentId
  const fetchAttachment = useMutation({
    mutationFn: async (id: number) => {
      console.log("Fetching attachment metadata for ID:", id);
      try {
        const res = await apiRequest('GET', `/api/attachments/${id}/metadata`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          console.error("Error fetching attachment:", errorData);
          throw new Error(errorData.message || `Server error: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Attachment metadata:", data);
        return data;
      } catch (error) {
        console.error("Failed to fetch attachment:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully fetched attachment:", data);
      setExistingAttachment(data);
    },
    onError: (error) => {
      // Log error but silently fail in UI, as the attachment may have been deleted
      console.error("Error in fetchAttachment:", error);
      setExistingAttachment(null);
    }
  });

  // Fetch the attachment metadata when component mounts if there's an attachmentId
  useEffect(() => {
    if (attachmentId) {
      fetchAttachment.mutate(attachmentId);
    }
  }, [attachmentId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if file is one of the accepted types
      const acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!acceptedTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG or PDF files are allowed",
          variant: "destructive",
        });
        return;
      }
      
      // Check if file size exceeds 5MB (5 * 1024 * 1024 bytes)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      
      // Notify parent component about the selected file
      if (onFileSelected) {
        onFileSelected(selectedFile);
      }
    }
  };

  const handleUpload = () => {
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    if (entityType && entityId) {
      formData.append('entityType', entityType);
      formData.append('entityId', entityId.toString());
    }
    
    uploadMutation.mutate(formData);
  };

  const handleDownload = () => {
    if (existingAttachment) {
      window.open(`/api/attachments/${existingAttachment.id}`, '_blank');
    }
  };

  const handleRemove = () => {
    setFile(null);
    // Also notify parent component
    if (onFileSelected) {
      onFileSelected(null);
    }
  };

  const handleRemoveExisting = () => {
    // Here you would typically call an API to remove the attachment
    // For now, we'll just clear the local state
    setExistingAttachment(null);
    if (onAttachmentUploaded) {
      onAttachmentUploaded(0); // Use 0 or null to indicate removal
    }
  };

  const getFileIcon = () => {
    if (!existingAttachment) return <FileText size={24} />;
    
    const fileType = existingAttachment.fileType || '';
    if (fileType && fileType.includes('image')) {
      return <img 
        src={`/api/attachments/${existingAttachment.id}`} 
        alt="Preview" 
        className="w-12 h-12 object-cover rounded"
      />;
    }
    
    return <FileText size={24} />;
  };

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center">
          <Paperclip className="mr-2" size={20} />
          <h3 className="text-lg font-semibold">Attachment</h3>
        </div>

        {existingAttachment ? (
          <div className="border rounded p-3 flex items-center justify-between">
            <div className="flex items-center">
              {getFileIcon()}
              <div className="ml-3">
                <p className="text-sm font-medium truncate max-w-[200px]">{existingAttachment.fileName || 'Attachment'}</p>
                <p className="text-xs text-muted-foreground">
                  {existingAttachment.fileSize ? ((existingAttachment.fileSize / 1024).toFixed(2) + ' KB') : 'Unknown size'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
              >
                <Download size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveExisting}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        ) : file ? (
          <div className="border rounded p-3 flex items-center justify-between">
            <div className="flex items-center">
              <FileText size={24} />
              <div className="ml-3">
                <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
            >
              <X size={16} />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.pdf"
            />
            <p className="text-xs text-muted-foreground">
              Accepted formats: JPG, PNG, PDF. Max size: 5MB
            </p>
          </div>
        )}

        {/* Button removed - file is automatically passed to parent for upload with form */}
      </div>
    </Card>
  );
}