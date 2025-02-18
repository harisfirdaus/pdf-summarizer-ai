
import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Copy, Upload, Settings } from "lucide-react";
import PDFSummarizer from "@/components/PDFSummarizer";
import ApiKeyModal from "@/components/ApiKeyModal";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState("");
  const [showApiModal, setShowApiModal] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file?.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }
    setFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setShowApiModal(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Set API Key
          </Button>
        </div>

        <div className="text-center space-y-3">
          <span className="px-3 py-1 text-sm bg-gray-100 rounded-full text-gray-600 inline-block">
            PDF Summarizer
          </span>
          <h1 className="text-4xl font-semibold tracking-tight">
            Summarize any PDF document
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            Upload your PDF and get an AI-powered summary using Google's Gemini
          </p>
        </div>

        <Card className="p-8 space-y-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">
              {isDragActive
                ? "Drop your PDF here"
                : "Drag and drop your PDF here, or click to browse"}
            </p>
            {file && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {file.name}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <Textarea
                placeholder="Enter any special instructions for the summary..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>

          {file && (
            <PDFSummarizer
              file={file}
              instructions={instructions}
            />
          )}
        </Card>
      </div>
      
      <ApiKeyModal 
        open={showApiModal}
        onClose={() => setShowApiModal(false)}
      />
    </div>
  );
};

export default Index;
