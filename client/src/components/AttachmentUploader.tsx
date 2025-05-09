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
  entityType: 'income' | 'expense';
  entityId?: number;
  attachmentId?: number | null;
  onAttachmentUploaded?: (attachmentId: number) => void;
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
  onAttachmentUploaded,
  className
}: AttachmentUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingAttachment, setExistingAttachment] = useState<Attachment | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest('POST', '/api/attachments', formData, {
        isFormData: true
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Attachment uploaded successfully",
      });
      setFile(null);
      setIsUploading(false);
      setExistingAttachment(data);
      
      if (onAttachmentUploaded) {
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
      toast({
        title: "Error",
        description: `Failed to upload attachment: ${error.message}`,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });

  // Fetch existing attachment if there's an attachmentId
  const fetchAttachment = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('GET', `/api/attachments/${id}/metadata`);
      return await res.json();
    },
    onSuccess: (data) => {
      setExistingAttachment(data);
    },
    onError: () => {
      // Silently fail, the attachment may have been deleted or is inaccessible
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
    
    const fileType = existingAttachment.fileType;
    if (fileType.includes('image')) {
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
                <p className="text-sm font-medium truncate max-w-[200px]">{existingAttachment.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {(existingAttachment.fileSize / 1024).toFixed(2)} KB
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

        {file && !existingAttachment && (
          <div className="flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}