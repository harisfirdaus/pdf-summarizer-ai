
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiKeyModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiKeyModal = ({ open, onClose }: ApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-pro");
  const [provider, setProvider] = useState("gemini");
  const { toast } = useToast();

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }

    window.localStorage.setItem(`${provider.toUpperCase()}_API_KEY`, apiKey.trim());
    window.localStorage.setItem(`${provider.toUpperCase()}_MODEL`, selectedModel);
    toast({
      title: "Success",
      description: "API key saved successfully",
    });
    onClose();
  };

  useEffect(() => {
    const savedProvider = window.localStorage.getItem("SELECTED_PROVIDER") || "gemini";
    setProvider(savedProvider);
    const savedKey = window.localStorage.getItem(`${savedProvider.toUpperCase()}_API_KEY`);
    const savedModel = window.localStorage.getItem(`${savedProvider.toUpperCase()}_MODEL`);
    if (savedKey) {
      setApiKey(savedKey);
    }
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("SELECTED_PROVIDER", provider);
    const savedKey = window.localStorage.getItem(`${provider.toUpperCase()}_API_KEY`);
    const savedModel = window.localStorage.getItem(`${provider.toUpperCase()}_MODEL`);
    setApiKey(savedKey || "");
    setSelectedModel(savedModel || (provider === "gemini" ? "gemini-pro" : "gpt-4o"));
  }, [provider]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
          <DialogDescription>
            Enter your API key and select the model to use for PDF summarization. Your settings will be stored locally.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-4">
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue placeholder="Select API Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Google Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="password"
              placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />

            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {provider === "gemini" ? (
                  <>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    <SelectItem value="gemini-1.5-pro">Gemini 1.5 Flash</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="gpt-4o">GPT-4O</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Settings</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
