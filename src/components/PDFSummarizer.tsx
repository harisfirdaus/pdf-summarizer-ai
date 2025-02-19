
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createWorker } from 'tesseract.js';
import { Checkbox } from "@/components/ui/checkbox";

interface PDFSummarizerProps {
  file: File;
  instructions: string;
}

interface PageSelection {
  pageNum: number;
  selected: boolean;
}

const PDFSummarizer = ({ file, instructions }: PDFSummarizerProps) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
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
    
    if (error.status === 429) {
      toast({
        title: "API Quota Exceeded",
        description: "You've reached the API rate limit. Please try again after a few minutes or use a different API key.",
        variant: "destructive",
      });
      return;
    }

    const errorMessage = error.body ? JSON.parse(error.body)?.error?.message : error.message;
    toast({
      title: "Error",
      description: errorMessage || "Failed to summarize PDF. Please try again.",
      variant: "destructive",
    });
  };

  const initializePDF = async () => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setTotalPages(pdf.numPages);
      setPageSelections(Array.from({ length: pdf.numPages }, (_, i) => ({
        pageNum: i + 1,
        selected: false
      })));
    } catch (error) {
      console.error("Error initializing PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF file",
        variant: "destructive",
      });
    }
  };

  const summarizePDF = async () => {
    if (!pageSelections.some(page => page.selected)) {
      toast({
        title: "No Pages Selected",
        description: "Please select at least one page to summarize",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (const selection of pageSelections) {
        if (!selection.selected) continue;
        
        const page = await pdf.getPage(selection.pageNum);
        const textContent = await page.getTextContent();
        let pageText = textContent.items.map((item: any) => item.str).join(' ');
        
        if (!pageText.trim()) {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context!,
            viewport: viewport
          }).promise;
          
          pageText = await performOCR(canvas);
        }
        
        fullText += `Page ${selection.pageNum}: ${pageText}\n\n`;
      }
      
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

      const prompt = `Please summarize the following text. ${
        instructions ? `Additional instructions: ${instructions}` : ""
      }\n\nText to summarize: ${fullText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const formattedSummary = formatSummary(response.text());
      
      setSummary(formattedSummary);
      toast({
        title: "Success",
        description: "Selected pages have been summarized!",
      });
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePageSelection = (pageNum: number) => {
    setPageSelections(prev => 
      prev.map(page => 
        page.pageNum === pageNum 
          ? { ...page, selected: !page.selected }
          : page
      )
    );
  };

  useEffect(() => {
    if (file) {
      initializePDF();
    }
  }, [file]);

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
      <div className="flex flex-col gap-4">
        {totalPages > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-2">Select pages to summarize:</h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {pageSelections.map((page) => (
                <div key={page.pageNum} className="flex items-center space-x-2">
                  <Checkbox
                    id={`page-${page.pageNum}`}
                    checked={page.selected}
                    onCheckedChange={() => togglePageSelection(page.pageNum)}
                  />
                  <label
                    htmlFor={`page-${page.pageNum}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {page.pageNum}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

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
            "Summarize Selected Pages"
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
