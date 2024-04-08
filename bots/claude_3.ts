import * as types from "../main.d.ts";

type ClaudeResponse = {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string | null;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

export const information: types.information = {
  llmFileVersion: "1.0",
  env: ["ANTHROPIC_API_KEY"],
  functions: false,
  multiModal: false, // Listen man I just want to get this to work. I will fix the images later. SHUT UP. IT FUNCTIONS.
  callbackSupport: true,
  streamingSupport: false,
  id: "c3opus",
  name: "Claude 3 Opus",
  description: "A very strong LLM for answering questions.",
  highCostLLM: true,
};

// const db = await Deno.openKv("./db.sqlite")

/*function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // Base64 encode the binary string
}*/

export async function send(
  prompt: string | null,
  messages: types.Message[],
  callback?:
    | ((information: types.callbackData, complete: boolean) => void)
    | null,
  requirements?: types.Requirements,
): Promise<types.Response> {
  // here we go

  if (!requirements?.env?.ANTHROPIC_API_KEY) {
    throw new DOMException("env.OPENAI_API_KEY", "NotFoundError");
  }

  if (requirements.streaming) {
    throw new DOMException("streaming", "NotSupportedError");
  }

  const sysprompt =
    "You are Claude 3 Opus, an LLM by Anthropic. You are running through a Discord bot named LLM Bot, by Eris.";

  /*const contentarr: types.AnthropicContentPart[] = [];

  if (requirements.images) {
    // Use map to create an array of promises
    const imagePromises = requirements.images.map(async (image_url) => {
      const img = await fetch(image_url);

      const imageType = img.headers.get("Content-Type");

      if (!imageType || !imageType.startsWith("image/")) {
        throw new Error(
          "Whoever's managing the images for this did an absolutely terrible job.",
        );
      } else {
        const imageArrayBuffer = await img.arrayBuffer();
        console.log(imageArrayBuffer);
        const imageData = arrayBufferToBase64(imageArrayBuffer);
        contentarr.push({
          type: "image",
          source: {
            type: "base64",
            media_type: imageType,
            data: imageData,
          },
        });
        console.log(imageType);
      }
    });

    // Wait for all the image processing to complete
    await Promise.all(imagePromises);
  }

  // After all images are processed, push the text content
  contentarr.push({
    type: "text",
    text: prompt!,
  });

  let msg: ClaudeMessage = {
    role: "user",
    content: contentarr,
  };

  messages.push(msg);*/

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": `${requirements.env.ANTHROPIC_API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      messages: messages,
      system: sysprompt,
    }),
  });

  const resp: ClaudeResponse = await res.json();

  messages.push({ role: "assistant", content: resp.content[0].text });

  if (callback) callback({ data: resp.content[0].text }, true);

  return {
    id: resp.id,
    choices: [{
      finish_reason: resp.stop_reason,
      message: {
        content: resp.content[0].text,
        role: "assistant",
      },
    }],
    messages: messages,
    created: Date.now(),
    model: resp.model,
    object: "chat.completion",
  };
}
