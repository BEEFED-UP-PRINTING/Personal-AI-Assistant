import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetOpenaiConversationQueryKey } from "@workspace/api-client-react";

export function useChatStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);

  const streamMessage = async (conversationId: number, content: string, image?: string) => {
    setIsStreaming(true);
    const queryKey = getGetOpenaiConversationQueryKey(conversationId);
    const temporaryUserMessageId = Date.now();
    const temporaryAssistantMessageId = temporaryUserMessageId + 1;

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [
          ...old.messages,
          {
            id: temporaryUserMessageId,
            conversationId,
            role: "user",
            content,
            image: image ?? null,
            createdAt: new Date().toISOString(),
          },
          {
            id: temporaryAssistantMessageId,
            conversationId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });

    try {
      const response = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, image: image ?? undefined }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No reader available");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.done) break;

              if (data.content) {
                queryClient.setQueryData(queryKey, (old: any) => {
                  if (!old) return old;
                  const newMessages = [...old.messages];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage && lastMessage.role === "assistant") {
                    lastMessage.content += data.content;
                  }

                  return { ...old, messages: newMessages };
                });
              }
            } catch (e) {
              console.error("Failed to parse SSE chunk", dataStr);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      setIsStreaming(false);
      await queryClient.invalidateQueries({ queryKey });
    }
  };

  return { streamMessage, isStreaming };
}
