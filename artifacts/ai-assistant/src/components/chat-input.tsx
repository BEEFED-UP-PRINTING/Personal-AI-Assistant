import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string, image?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
  };

  const handleSubmit = () => {
    if ((!input.trim() && !imageBase64) || disabled) return;
    onSend(input.trim(), imageBase64 ?? undefined);
    setInput("");
    setImagePreview(null);
    setImageBase64(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = (input.trim() || imageBase64) && !disabled;

  return (
    <div className="relative mx-auto max-w-3xl w-full px-2 pb-2">
      <div
        className="relative flex flex-col rounded-2xl border shadow-lg transition-all"
        style={{ background: "#141210", borderColor: "#2a2520" }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = "#e8a020")}
        onBlurCapture={e => (e.currentTarget.style.borderColor = "#2a2520")}
      >
        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 pt-3">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Upload preview"
                className="h-20 w-20 rounded-xl object-cover border"
                style={{ borderColor: "#3a3028" }}
              />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full flex items-center justify-center border"
                style={{ background: "#0a0a0a", borderColor: "#3a3028", color: "#9a8f7e" }}
              >
                <X size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Text + buttons row */}
        <div className="flex items-end p-2">
          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 mb-1 ml-1 rounded-lg transition-colors flex-shrink-0"
            style={{ color: "#4a4038" }}
            onMouseEnter={e => {
              if (!disabled) (e.currentTarget.style.color = "#e8a020");
            }}
            onMouseLeave={e => (e.currentTarget.style.color = "#4a4038")}
            title="Upload image"
          >
            <ImagePlus size={18} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Maggie anything..."
            className="w-full max-h-[200px] min-h-[44px] resize-none bg-transparent px-3 py-3 focus:outline-none scrollbar-thin text-sm"
            style={{ color: "#f5f0e8" }}
            rows={1}
            disabled={disabled}
          />

          <div className="p-1 mb-1 mr-1 flex-shrink-0">
            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className="flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 font-bold"
              style={
                canSend
                  ? { background: "#e8a020", color: "#0a0a0a" }
                  : { background: "#1e1a14", color: "#4a4038", cursor: "not-allowed" }
              }
              onMouseEnter={e => {
                if (canSend) (e.currentTarget.style.background = "#f0b030");
              }}
              onMouseLeave={e => {
                if (canSend) (e.currentTarget.style.background = "#e8a020");
              }}
            >
              {disabled ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <ArrowUp size={17} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-2">
        <p className="text-[10px] font-medium" style={{ color: "#3a3028" }}>
          Maggie · Beefed Up Printing AI · Sharp sharp, but verify the details yourself
        </p>
      </div>
    </div>
  );
}
