
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface PDFSummarizerProps {
  file: File;
  instructions: string;
}

const PDFSummarizer = ({ file, instructions }: PDFSummarizerProps) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const summarizePDF = async () => {
    setLoading(true);
    try {
      // First, read the PDF file
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = new Uint8Array(arrayBuffer);
      
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(window.localStorage.getItem("GEMINI_API_KEY") || "");
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Convert PDF to text using pdf-parse
      const pdfjsLib = await import("pdf-parse");
      const data = await pdfjsLib.default(pdfData);
      const text = data.text;

      // Prepare the prompt
      const prompt = `Please summarize the following text. ${
        instructions ? `Additional instructions: ${instructions}` : ""
      }\n\nText to summarize: ${text}`;

      // Generate summary
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();
      
      setSummary(summary);
      toast({
        title: "Summary generated",
        description: "Your PDF has been successfully summarized!",
      });
    } catch (error) {
      console.error("Error summarizing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to summarize PDF. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Summary copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={summarizePDF}
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Summarizing...
            </>
          ) : (
            "Generate Summary"
          )}
        </Button>
      </div>

      {summary && (
        <div className="space-y-4">
          <div className="relative">
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700">
              {summary}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2"
              onClick={copyToClipboard}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFSummarizer;
