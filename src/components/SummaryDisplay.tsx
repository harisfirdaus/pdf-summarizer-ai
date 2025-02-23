
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface SummaryDisplayProps {
  summary: string;
}

const SummaryDisplay = ({ summary }: SummaryDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

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
  );
};

export default SummaryDisplay;

