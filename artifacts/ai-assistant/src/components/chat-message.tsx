import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";
import { User, Volume2, VolumeX, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useRef } from "react";

interface ChatMessageProps {
  role: "user" | "assistant" | string;
  content: string;
  image?: string | null;
}

function MaggieVoiceButton({ content }: { content: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVoice = async () => {
    // If already playing, stop it
    if (state === "playing") {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
      setState("idle");
      return;
    }

    setState("loading");

    try {
      const response = await fetch("/api/openai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };

      audio.onerror = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };

      setState("playing");
      await audio.play();
    } catch (err) {
      console.error("Voice error:", err);
      setState("idle");
    }
  };

  return (
    <button
      onClick={handleVoice}
      title={state === "playing" ? "Stop" : "Hear Maggie"}
      className="mt-2 flex items-center gap-1.5 text-[11px] font-medium transition-all rounded-lg px-2.5 py-1.5 border"
      style={{
        color: state === "playing" ? "#e8a020" : "#6b6058",
        borderColor: state === "playing" ? "#e8a020" : "#2a2520",
        background: state === "playing" ? "rgba(232,160,32,0.08)" : "transparent",
      }}
      onMouseEnter={e => {
        if (state !== "playing") {
          (e.currentTarget).style.color = "#e8a020";
          (e.currentTarget).style.borderColor = "#e8a020";
        }
      }}
      onMouseLeave={e => {
        if (state !== "playing") {
          (e.currentTarget).style.color = "#6b6058";
          (e.currentTarget).style.borderColor = "#2a2520";
        }
      }}
    >
      {state === "loading" ? (
        <Loader2 size={12} className="animate-spin" />
      ) : state === "playing" ? (
        <VolumeX size={12} />
      ) : (
        <Volume2 size={12} />
      )}
      {state === "loading" ? "Loading..." : state === "playing" ? "Stop" : "Hear Maggie"}
    </button>
  );
}

export function ChatMessage({ role, content, image }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex w-full px-4 py-5 md:px-8",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-3xl w-full gap-3",
          isUser ? "flex-row-reverse" : "flex-row"
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border"
              style={{ background: "#1e1a14", borderColor: "#3a3028", color: "#c8b89a" }}
            >
              <User size={15} />
            </div>
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border shadow-lg"
              style={{ borderColor: "#e8a020", boxShadow: "0 0 12px rgba(232,160,32,0.2)" }}
            >
              <img
                src="/beefed-up-brand.png"
                alt="Maggie"
                className="w-full h-full object-cover scale-125"
              />
            </div>
          )}
        </div>

        {/* Message body */}
        <div
          className={cn(
            "flex flex-col min-w-0 flex-1",
            isUser ? "items-end" : "items-start pt-0.5"
          )}
        >
          {!isUser && (
            <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: "#e8a020" }}>
              Maggie
            </p>
          )}

          {isUser ? (
            <div className="flex flex-col items-end gap-2">
              {image && (
                <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#2a2520" }}>
                  <img
                    src={image}
                    alt="Uploaded"
                    className="max-h-60 max-w-xs rounded-2xl object-contain"
                  />
                </div>
              )}
              {content && (
                <div
                  className="px-5 py-3.5 rounded-3xl rounded-tr-sm whitespace-pre-wrap leading-relaxed text-sm border"
                  style={{ background: "#1e1a14", color: "#f5f0e8", borderColor: "#2a2520" }}
                >
                  {content}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full">
              <div style={{ color: "#d8cfc4" }}>
                <MarkdownRenderer content={content} />
              </div>
              {content && <MaggieVoiceButton content={content} />}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
