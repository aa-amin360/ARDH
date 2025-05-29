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
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function IncomeBulkUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [failedRecords, setFailedRecords] = useState<any[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    successful: number;
    failed: number;
    total: number;
  } | null>(null);

  // Template download function
  const downloadTemplate = () => {
    // Create the headers as per specification
    const headers = [
      "date",
      "amount", 
      "type",
      "description",
      "property_id",
      "received_from"
    ];

    // Create sample data with flat_number in property_id field
    const sampleData = [
      "2025-01-15",
      "15000",
      "rent",
      "January 2025 Rent",
      "101",
      "John Doe"
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

  // Function to download failed records CSV
  const downloadFailedRecords = () => {
    if (failedRecords.length === 0) return;

    const headers = [
      "date",
      "amount",
      "type", 
      "description",
      "property_id",
      "received_from",
      "error_message"
    ];

    const csvContent = [
      headers.join(","),
      ...failedRecords.map(record => [
        record.date || "",
        record.amount || "",
        record.type || "",
        record.description || "",
        record.property_id || "",
        record.received_from || "",
        `"${record.error_message || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "failed_income_records.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Failed records downloaded",
      description: "CSV with failed records and error messages has been downloaded."
    });
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiRequest("POST", "/api/incomes/bulk-upload", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      setUploadResult({
        successful: data.successful || 0,
        failed: data.failed || 0,
        total: data.total || 0
      });
      
      if (data.failedRecords && data.failedRecords.length > 0) {
        setFailedRecords(data.failedRecords);
      }

      toast({
        title: "Upload completed",
        description: `Successfully uploaded ${data.successful} out of ${data.total} records.${data.failed > 0 ? ` ${data.failed} records failed.` : ""}`
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/incomes"] });
      setFile(null);
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
      setUploadProgress(0);
    }
  });

  // Handle submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    // Reset previous results
    setUploadResult(null);
    setFailedRecords([]);
    setUploadProgress(10);
    
    // Create form data
    const formData = new FormData();
    formData.append("file", file);
    
    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
    
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
              Download the template, fill in your data, and upload it back. 
              <br />
              <strong>Note:</strong> Enter flat number (e.g., 101, 102) in the property_id field.
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

            {/* Progress bar during upload */}
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

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

          {/* Upload Results */}
          {uploadResult && (
            <div className="mt-6 space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Upload Results</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Records:</span>
                    <div className="font-medium">{uploadResult.total}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Successful:</span>
                    <div className="font-medium text-green-600">{uploadResult.successful}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Failed:</span>
                    <div className="font-medium text-red-600">{uploadResult.failed}</div>
                  </div>
                </div>
              </div>

              {/* Failed Records Table */}
              {failedRecords.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-red-600">Failed Records</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={downloadFailedRecords}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download Failed Records
                    </Button>
                  </div>
                  <div className="border rounded-lg max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Property ID</TableHead>
                          <TableHead>Error Message</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {failedRecords.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.date || "-"}</TableCell>
                            <TableCell>{record.amount || "-"}</TableCell>
                            <TableCell>{record.type || "-"}</TableCell>
                            <TableCell>{record.property_id || "-"}</TableCell>
                            <TableCell className="text-red-600 text-sm">
                              {record.error_message || "Unknown error"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {failedRecords.length === 0 && uploadResult.failed === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    All {uploadResult.successful} records were uploaded successfully.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IncomeBulkUpload;