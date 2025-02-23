
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PageSelector from "./PageSelector";
import SummaryDisplay from "./SummaryDisplay";
import { performOCR } from "../utils/ocrUtils";
import { formatSummary } from "../utils/textUtils";

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
  const [totalPages, setTotalPages] = useState(0);
  const [pageSelections, setPageSelections] = useState<PageSelection[]>([]);
  const { toast } = useToast();

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

  const togglePageSelection = (pageNum: number) => {
    setPageSelections(prev => 
      prev.map(page => 
        page.pageNum === pageNum 
          ? { ...page, selected: !page.selected }
          : page
      )
    );
  };

  const summarizePDF = async () => {
    const selectedPages = pageSelections.filter(page => page.selected);
    
    if (selectedPages.length === 0) {
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
      
      const summaries = [];
      
      for (const selection of selectedPages) {
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
        }\n\nText to summarize: ${pageText}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        summaries.push(formatSummary(response.text()));
      }
      
      setSummary(summaries.join('\n\n'));
      
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

  useEffect(() => {
    if (file) {
      initializePDF();
    }
  }, [file]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {totalPages > 0 && (
          <PageSelector
            pageSelections={pageSelections}
            onTogglePage={togglePageSelection}
          />
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

      {summary && <SummaryDisplay summary={summary} />}
    </div>
  );
};

export default PDFSummarizer;

