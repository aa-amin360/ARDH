import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Download } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const ExpenseBulkUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/expenses/bulk-upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to bulk upload expenses");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setUploadSuccess(`Successfully uploaded ${data.successCount} expenses.`);
      setUploadErrors(data.errors || []);
      setIsUploading(false);
      
      if (data.errors && data.errors.length === 0) {
        setBulkUploadFile(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Handle bulk upload file change
  const handleBulkUploadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBulkUploadFile(e.target.files[0]);
      setUploadErrors([]);
      setUploadSuccess(null);
    }
  };

  // Handle bulk upload submission
  const handleBulkUpload = () => {
    if (!bulkUploadFile) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    bulkUploadMutation.mutate(bulkUploadFile);
  };

  // Download bulk upload template
  const downloadTemplate = async () => {
    try {
      const response = await fetch("/api/expenses/template");
      if (!response.ok) {
        throw new Error("Failed to download template");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expense_upload_template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
        <Input
          type="file"
          accept=".csv"
          onChange={handleBulkUploadFileChange}
          disabled={isUploading}
        />
        <Button onClick={handleBulkUpload} disabled={!bulkUploadFile || isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload"
          )}
        </Button>
      </div>
      
      {uploadSuccess && (
        <div className="p-3 bg-green-50 text-green-700 rounded">
          {uploadSuccess}
        </div>
      )}
      
      {uploadErrors.length > 0 && (
        <div className="p-3 bg-red-50 text-red-700 rounded">
          <p className="font-bold">Errors:</p>
          <ul className="list-disc list-inside">
            {uploadErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ExpenseBulkUpload;