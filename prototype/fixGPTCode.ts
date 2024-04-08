import * as types from "../main.d.ts";

type ClaudeMessage = {
  role: string;
  content: {
    type: string;
    source?: {
      type: string;
      media_type: string;
      data: string;
    };
    text?: string;
  }[];
};

function convertMessages(
  messages: (ClaudeMessage | types.Message)[],
): (ClaudeMessage | types.Message)[] {
  return messages.map((message) => {
    if ("content" in message && Array.isArray(message.content)) {
      const content: types.ContentPart[] = [];
      for (const part of message.content) {
        if (part.type === "text") {
          content.push({ type: "text", text: part.text || "" });
        } else if (part.type === "image_url") {
          content.push({
            type: "image_url",
            image_url: {
              url: part.source?.data || "",
              detail: part.source?.media_type || "auto",
            },
          });
        }
      }

      return {
        role: message.role,
        content: content.length > 0 ? content : null,
      };
    } else {
      const content: {
        type: string;
        text?: string;
        source?: { type: string; media_type: string; data: string };
      }[] = [];
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (typeof part === "string") {
            content.push({ type: "text", text: part });
          } else if (part.type === "text") {
            content.push({ type: "text", text: part.text });
          } else if (part.type === "image_url") {
            content.push({
              type: "image",
              source: {
                type: "image_url",
                media_type: "image",
                data: part.image_url.url,
              },
            });
          }
        }
      }

      return {
        role: message.role,
        content,
      };
    }
  });
}

console.log(
  convertMessages([{
    "role": "user",
    "content": [{ "type": "text", "text": "Hello, Claude" }],
  }]),
);
