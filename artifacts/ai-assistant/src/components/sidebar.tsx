import { Link, useLocation } from "wouter";
import { PlusCircle, MessageSquare, Trash2, LayoutPanelLeft } from "lucide-react";
import { useListOpenaiConversations, useDeleteOpenaiConversation } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Sidebar() {
  const [location] = useLocation();
  const { data: conversations, isLoading } = useListOpenaiConversations();
  const deleteMutation = useDeleteOpenaiConversation();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const activeId = location.startsWith("/c/") ? parseInt(location.split("/")[2], 10) : null;

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
      if (activeId === id) {
        window.location.href = "/";
      }
    }
  };

  if (!isSidebarOpen) {
    return (
      <div className="absolute top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "#9a8f7e" }}
          onMouseEnter={e => (e.currentTarget.style.color = "#f5f0e8")}
          onMouseLeave={e => (e.currentTarget.style.color = "#9a8f7e")}
        >
          <LayoutPanelLeft size={20} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-64 flex-col border-r transition-all duration-300"
      style={{ background: "#0d0d0d", borderColor: "#1e1a16" }}
    >
      {/* Brand Header */}
      <div className="p-4 border-b" style={{ borderColor: "#1e1a16" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "#9a8f7e" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f5f0e8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#9a8f7e")}
          >
            <LayoutPanelLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-amber-500/30 flex-shrink-0">
              <img src="/beefed-up-brand.png" alt="Beefed Up" className="w-full h-full object-cover scale-125" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-wide truncate" style={{ color: "#e8a020" }}>MAGGIE</p>
              <p className="text-[10px] truncate" style={{ color: "#6b6058" }}>Beefed Up Printing</p>
            </div>
          </div>
        </div>

        <Link href="/">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all cursor-pointer border"
            style={{ background: "#e8a020", color: "#0a0a0a", borderColor: "#e8a020" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#f0b030";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.background = "#e8a020";
            }}
          >
            <PlusCircle size={16} />
            New Chat
          </div>
        </Link>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
        <div
          className="text-[10px] font-bold uppercase tracking-widest mb-3 px-2 mt-3"
          style={{ color: "#4a4038" }}
        >
          Chat History
        </div>

        {isLoading ? (
          <div className="space-y-2 px-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: "#1a1410" }} />
            ))}
          </div>
        ) : !conversations?.length ? (
          <div className="px-2 text-sm italic" style={{ color: "#4a4038" }}>
            No chats yet — start one!
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const isActive = activeId === conv.id;
              return (
                <Link key={conv.id} href={`/c/${conv.id}`}>
                  <div
                    className="group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200"
                    style={{
                      background: isActive ? "#1e1a14" : "transparent",
                      color: isActive ? "#f5f0e8" : "#7a6f62",
                      borderLeft: isActive ? "2px solid #e8a020" : "2px solid transparent",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = "#141210";
                        (e.currentTarget as HTMLDivElement).style.color = "#c8b89a";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = "transparent";
                        (e.currentTarget as HTMLDivElement).style.color = "#7a6f62";
                      }
                    }}
                  >
                    <MessageSquare size={15} style={{ color: isActive ? "#e8a020" : "#4a4038", flexShrink: 0 }} />
                    <div className="flex-1 truncate text-xs font-medium">
                      {conv.title || "New Conversation"}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                      style={{ color: "#7a6f62" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#e85030")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#7a6f62")}
                      title="Delete chat"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t" style={{ borderColor: "#1e1a16" }}>
        <p className="text-[10px] text-center font-bold uppercase tracking-widest" style={{ color: "#3a3028" }}>
          Custom Designed Not Bought
        </p>
      </div>
    </div>
  );
}
