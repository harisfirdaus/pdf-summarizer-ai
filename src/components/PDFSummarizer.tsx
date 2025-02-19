
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createWorker } from 'tesseract.js';

interface PDFSummarizerProps {
  file: File;
  instructions: string;
}

const PDFSummarizer = ({ file, instructions }: PDFSummarizerProps) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const performOCR = async (canvas: HTMLCanvasElement) => {
    const worker = await createWorker();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();
    return text;
  };

  const formatSummary = (text: string) => {
    // Remove "Paragraf X:" prefixes and clean up the text
    return text
      .replace(/\*\*Paragraf \d+:\*\*/g, '')
      .replace(/Paragraf \d+:/g, '')
      .split('\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .join('\n\n');
  };

  const handleApiError = (error: any) => {
    console.error("API Error:", error);
    
    // Check if it's a rate limit error
    if (error.status === 429) {
      toast({
        title: "API Quota Exceeded",
        description: "You've reached the API rate limit. Please try again after a few minutes or use a different API key.",
        variant: "destructive",
      });
      return;
    }

    // Handle other API errors
    const errorMessage = error.body ? JSON.parse(error.body)?.error?.message : error.message;
    toast({
      title: "Error",
      description: errorMessage || "Failed to summarize PDF. Please try again.",
      variant: "destructive",
    });
  };

  const summarizePDF = async () => {
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Process each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        // Try to get text content first
        const textContent = await page.getTextContent();
        let pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        // If no text is extracted, try OCR
        if (!pageText.trim()) {
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          // Perform OCR on the canvas
          pageText = await performOCR(canvas);
        }
        
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
      const formattedSummary = formatSummary(response.text());
      
      setSummary(formattedSummary);
      toast({
        title: "Success",
        description: "Your PDF has been successfully summarized!",
      });
    } catch (error: any) {
      handleApiError(error);
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
            <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-line">
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
