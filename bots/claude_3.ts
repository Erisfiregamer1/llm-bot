import * as types from "../main.d.ts";

// const db = await Deno.openKv("./db.sqlite")

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // Base64 encode the binary string
}

export async function send(
  messages: types.Message[],
  prompt: string | null,
  callback: (type: string, data: types.llmFileResponseClaude) => void,
  values: types.Values,
): Promise<types.llmFileResponseClaude> {
  // here we go

  const sysprompt =
    "You are Claude 3 Opus, an LLM by Anthropic. You are running through a Discord bot named LLM Bot, by Eris.";

  const contentarr: types.AnthropicContentPart[] = [];

  if (values.images) {
    // Use map to create an array of promises
    const imagePromises = values.images.map(async (image_url) => {
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

  let msg = {
    role: "user",
    content: contentarr,
  };

  messages.push(msg);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": `${values.env.ANTHROPIC_API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 4096,
      messages: messages,
      system: sysprompt,
    }),
  });

  const resp: types.claudeResponse | types.Error = await res.json();

  messages.push({ role: "assistant", content: resp.content[0].text });

  const fresp = {
    resp,
    messages,
  };

  callback("complete", fresp);

  return fresp;
}
