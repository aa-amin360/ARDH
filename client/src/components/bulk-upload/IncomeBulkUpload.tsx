import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileUp, Download, AlertCircle, Loader2 } from "lucide-react";

export function IncomeBulkUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Template download function
  const downloadTemplate = () => {
    // Create the headers
    const headers = [
      "date",
      "amount",
      "type",
      "description",
      "flatNumber",
      "receivedFrom",
      "notes"
    ];

    // Create sample data
    const sampleData = [
      "2023-04-01",
      "15000",
      "rent",
      "April 2023 Rent",
      "101",
      "John Doe",
      "Rent for April 2023"
    ];

    // Create CSV content
    const csvContent = [
      headers.join(","),
      sampleData.join(",")
    ].join("\n");

    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "income_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded",
      description: "The income template has been downloaded successfully."
    });
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check file type
      if (!selectedFile.name.endsWith('.csv')) {
        setError("Please upload a CSV file");
        setFile(null);
        return;
      }
      
      setError(null);
      setFile(selectedFile);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/incomes/bulk-upload", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Income records uploaded",
        description: `Successfully uploaded ${data.count} income records.`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      setFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    
    // Upload file
    uploadMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Income</CardTitle>
        <CardDescription>
          Upload multiple income records at once using a CSV file
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="w-full md:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Download the template, fill in your data, and upload it back
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="income-csv">Income CSV File</Label>
              <Input
                id="income-csv"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  Selected file: {file.name}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={!file || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload Income Records
                </>
              )}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export default IncomeBulkUpload;