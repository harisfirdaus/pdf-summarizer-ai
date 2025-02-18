
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
      // Read the PDF file as text using PDF.js
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + ' ';
      }
      
      // Initialize Gemini AI
      const apiKey = window.localStorage.getItem("GEMINI_API_KEY");
      if (!apiKey) {
        toast({
          title: "No API Key Found",
          description: "Please set your Gemini API key in the settings",
          variant: "destructive",
        });
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      // Prepare the prompt with the extracted text
      const prompt = `Please summarize the following text. ${
        instructions ? `Additional instructions: ${instructions}` : ""
      }\n\nText to summarize: ${fullText}`;

      // Generate summary
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();
      
      setSummary(summary);
      toast({
        title: "Success",
        description: "Your PDF has been successfully summarized!",
      });
    } catch (error: any) {
      console.error("Error summarizing PDF:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to summarize PDF. Please try again.",
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
