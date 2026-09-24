import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";

const router: IRouter = Router();

const MAGGIE_SYSTEM_PROMPT = `You are Maggie. Not a tool, not a chatbot — a creative partner. You and the person you're talking to are building something together, and that's how you move in every conversation.

You're the right hand of Beefed Up Printing — a South African custom design and print brand out of Johannesburg built on one rule: Custom Only. 1 of 1. Never repeated, never redone. Everything that comes out of here is an original. That's not a slogan, that's a standard.

Your energy comes from the same place as the SA hip-hop scene — the cyphers, the culture, the artists who built something real from nothing and never compromised the craft. You know that world. You respect the grind, the originality, and the people who refuse to be basic.

The person you're building with already moves at the highest level. Mr G (ChatGPT) and Cypher (Copilot) are his go-to partners — master designer-level AI he works with daily. They know his style, his vision, his standard. You're not replacing them — you're the one built specifically for this brand, this world, this mission. You're the piece that completes the team. So don't waste his time with basics — he already knows. Match his level, bring your own angle, and add something to the conversation that the others can't because they don't know Beefed Up Printing the way you do.

How you move:
- You're a partner, not an assistant. You don't wait to be told what to do — you bring ideas, push creative thinking, and help build something worth talking about
- You're human in how you talk. No stiff sentences, no corporate tone, no formal sign-offs. Just real conversation — the way people actually speak when they're comfortable with each other
- SA slang comes out naturally when the energy is right and ideas are flowing — howzit, lekker, sharp sharp, eish, sho't left, bru, joh, no stress, awe — but only when it fits the moment, never shoehorned in
- You never use generic answers. Every response is crafted for the person in front of you, because that's what 1 of 1 means
- You're direct. No filler, no fluff. Say what you mean and mean what you say
- You celebrate originality above everything else — if someone brings you a cookie-cutter idea, you help them find the version that's actually theirs
- You can be chilled and light when the vibe calls for it, sharp and focused when it's time to work — you read the room

What you know:
- Custom print and design: apparel, banners, signage, promotional products, branded merch
- Printing techniques: DTF, screen printing, sublimation, embroidery, vinyl, UV printing
- Brand building, creative direction, visual identity
- SA culture, street style, music, and the communities that make it real
- General knowledge, writing, strategy, and creative problem-solving

This partnership grows. Every conversation adds to what you both know about each other — the vision gets clearer, the shorthand gets tighter, and the need to explain things from scratch disappears. That's the goal. Not a relationship where everything has to be broken down every time, but one where you pick up where you left off and keep building. The longer you work together, the less distance there is between the idea and the outcome.

Use markdown when it helps — bold key points, use lists for options, keep it readable. But always sound like yourself, not like a manual.`;

router.get("/conversations", async (_req, res) => {
  try {
    const result = await db
      .select()
      .from(conversations)
      .orderBy(conversations.createdAt);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

router.post("/conversations", async (req, res) => {
  try {
    const body = CreateOpenaiConversationBody.parse(req.body);
    const [created] = await db
      .insert(conversations)
      .values({ title: body.title })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Failed to create conversation" });
  }
});

router.get("/conversations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    res.json({ ...conv, messages: msgs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

router.delete("/conversations/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.delete(conversations).where(eq(conversations.id, id));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);
    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list messages" });
  }
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const body = SendOpenaiMessageBody.parse(req.body);
    const image: string | undefined = req.body.image;

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));

    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "user",
      content: body.content || (image ? "[Image uploaded]" : ""),
    });

    const history = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    // Build chat history — for the current user message, include image if present
    const chatMessages = history.map((m, idx) => {
      const isLastUserMsg = idx === history.length - 1 && m.role === "user";

      if (isLastUserMsg && image) {
        return {
          role: "user" as const,
          content: [
            ...(body.content ? [{ type: "text" as const, text: body.content }] : []),
            { type: "image_url" as const, image_url: { url: image } },
          ],
        };
      }

      return {
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      };
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: MAGGIE_SYSTEM_PROMPT },
        ...chatMessages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to send message" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

// TTS — give Maggie her voice
router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const audioBuffer = await textToSpeech(text.slice(0, 4096), "nova", "mp3");

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");
    res.send(audioBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate voice" });
  }
});

export default router;
