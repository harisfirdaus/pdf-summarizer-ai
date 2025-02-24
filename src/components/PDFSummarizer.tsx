
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
      const provider = window.localStorage.getItem("SELECTED_PROVIDER") || "gemini";
      const apiKey = window.localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);

      if (!apiKey) {
        toast({
          title: "No API Key Found",
          description: `Please set your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key in the settings`,
          variant: "destructive",
        });
        return;
      }
      
      // Collect all page text first
      const allPageTexts = await Promise.all(
        selectedPages.map(async (selection) => {
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
          return { pageNum: selection.pageNum, text: pageText };
        })
      );
      
      // Create a comprehensive prompt that includes context about multiple pages
      const contextPrompt = `Please provide a coherent summary of the following ${selectedPages.length > 1 ? 'pages' : 'page'} from an article. ${instructions ? `Additional instructions: ${instructions}\n\n` : ''}

The content is from ${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} of a document. Please analyze the content, maintain the logical flow between pages, and provide a comprehensive summary that captures the main ideas and their relationships.\n\n`;

      const pageTexts = allPageTexts
        .map(({ pageNum, text }) => `Page ${pageNum}:\n${text}`)
        .join('\n\n');

      let summary = "";
      if (provider === "gemini") {
        const genAI = new GoogleGenerativeAI(apiKey);
        const selectedModel = window.localStorage.getItem("GEMINI_MODEL") || "gemini-pro";
        const model = genAI.getGenerativeModel({ model: selectedModel });

        const result = await model.generateContent(contextPrompt + pageTexts);
        const response = await result.response;
        summary = response.text();
      } else {
        const selectedModel = window.localStorage.getItem("OPENAI_MODEL") || "gpt-4o";
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [
              {
                role: "system",
                content: "You are a helpful assistant that provides coherent and well-structured summaries of multi-page articles."
              },
              {
                role: "user",
                content: contextPrompt + pageTexts
              }
            ]
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        summary = data.choices[0].message.content;
      }
      
      setSummary(formatSummary(summary));
      
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
