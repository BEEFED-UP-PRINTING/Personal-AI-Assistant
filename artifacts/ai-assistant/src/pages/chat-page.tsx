import { useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { Sidebar } from "@/components/sidebar";
import { ChatInput } from "@/components/chat-input";
import { ChatMessage } from "@/components/chat-message";
import { useGetOpenaiConversation, useCreateOpenaiConversation } from "@workspace/api-client-react";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const SUGGESTIONS = [
  "Design ideas for custom team jerseys",
  "What printing method suits a 50-piece order?",
  "Help me write a product description for my brand",
  "Difference between DTF and screen printing",
];

export function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const activeId = match && params?.id ? parseInt(params.id, 10) : null;

  const { data: conversation, isLoading } = useGetOpenaiConversation(activeId as number, {
    query: { enabled: !!activeId },
  });

  const createMutation = useCreateOpenaiConversation();
  const { streamMessage, isStreaming } = useChatStream();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, isStreaming]);

  const handleSend = async (content: string, image?: string) => {
    if (!content.trim() && !image) return;

    let targetId = activeId;

    if (!targetId) {
      const title = content.length > 50 ? content.slice(0, 47) + "..." : content || "Image upload";
      const newConv = await createMutation.mutateAsync({ data: { title } });
      targetId = newConv.id;
      setLocation(`/c/${newConv.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
    }

    if (targetId) {
      await streamMessage(targetId, content, image);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#0a0a0a", color: "#f5f0e8" }}>
      <Sidebar />

      <main className="flex flex-1 flex-col relative h-full min-w-0">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {!activeId ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center max-w-2xl text-center"
              >
                {/* Brand image */}
                <div className="mb-6 relative">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-xl shadow-amber-500/10">
                    <img
                      src="/beefed-up-brand.png"
                      alt="Beefed Up Printing"
                      className="w-full h-full object-cover object-center scale-125"
                    />
                  </div>
                  <span className="absolute -bottom-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                    Live
                  </span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1" style={{ color: "#f5f0e8" }}>
                  Howzit, I'm Maggie 👋
                </h1>
                <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#e8a020" }}>
                  Beefed Up Printing · AI Assistant
                </p>
                <p className="text-base mb-8" style={{ color: "#9a8f7e" }}>
                  Custom Designed Not Bought — and that includes the help you get here.
                  Ask me anything about your brand, your order, or your next big idea.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(suggestion)}
                      className="p-4 text-sm text-left rounded-xl transition-all duration-200 text-left border"
                      style={{
                        background: "#141414",
                        borderColor: "#2a2520",
                        color: "#c8b89a",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8a020";
                        (e.currentTarget as HTMLButtonElement).style.color = "#f5f0e8";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2520";
                        (e.currentTarget as HTMLButtonElement).style.color = "#c8b89a";
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="flex flex-col pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-20" style={{ color: "#9a8f7e" }}>
                  <span className="text-sm animate-pulse">Maggie is loading...</span>
                </div>
              ) : (
                <>
                  {conversation?.messages?.map((msg) => (
                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} image={(msg as any).image} />
                  ))}
                  {isStreaming && (
                    <div className="flex justify-start px-4 py-6 md:px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-amber-500/30 shadow-sm"
                          style={{ background: "#1a1410" }}
                        >
                          <img src="/beefed-up-brand.png" alt="Maggie" className="w-full h-full object-cover scale-125" />
                        </div>
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              className="w-2 h-2 rounded-full animate-bounce"
                              style={{ background: "#e8a020", animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </>
              )}
            </div>
          )}
        </div>

        <div className="pt-6 pb-2 px-4 shrink-0" style={{ background: "linear-gradient(to top, #0a0a0a 80%, transparent)" }}>
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </main>
    </div>
  );
}
