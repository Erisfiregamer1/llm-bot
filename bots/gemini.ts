export let isEnabled = true;

import * as types from "./types.ts";

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

// const db = await Deno.openKv("./db.sqlite")

async function processGeminiMessages(
  messages: types.Message[],
): Promise<(types.GeminiContentPartImage | types.GeminiContentPartText)[]> {
  const geminiFormattedMessages = [];

  for (const message of messages) {
    if (message.role === "system") {
      geminiFormattedMessages.push({ text: `System: ${message.content}` });
    } else if (message.role === "assistant") {
      geminiFormattedMessages.push({ text: `Model: ${message.content}` });
    } else if (message.role === "user") {
      geminiFormattedMessages.push({ text: `User: ${message.content}` });
    } else if (message.role === "image") {
      message.content = message.content as string;
      const imageData = await getImageData(message.content);

      geminiFormattedMessages.push({
        inlineData: {
          mimeType: imageData?.contentType!,
          data: imageData?.base64ImageData!,
        },
      });
    }
  }

  // All asynchronous operations inside the loop have completed here
  return geminiFormattedMessages;
}

async function getImageData(url: string) {
  try {
    const response = await fetch(url);

    const contentType = response.headers.get("Content-Type");

    const blob = await response.blob();

    // Step 4: Read the Blob as Data URL
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    // Step 5: Wait for the FileReader to finish
    await new Promise((resolve, reject) => {
      reader.onloadend = resolve;
      reader.onerror = reject;
    });

    // Step 6: Get the base64-encoded image data

    const resultString = reader.result as string;

    const base64ImageData = resultString.split(",")[1];

    return { contentType, base64ImageData };
  } catch (error) {
    console.error("Error:", error);
  }
}

export async function send(
  messages: types.Message[],
  prompt: string | null,
  images: string[],
): Promise<types.llmFileResponseGemini> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are Gemini Pro, a model created by Google. You are being proxied through Discord by a bot made by Eris. You can use basic markdown to structure your responses. No need to prefix your messages with emojis or what you are (Assisant/Model), we do that automatically. (Seriously, don't do that!!!) Everything that follows is messages, NOT examples.",
    });
  }

  if (prompt !== null) {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  images.forEach((image) => {
    messages.push({
      role: "image",
      content: image,
    });
  });

  let useImageModel = false;

  console.log(useImageModel);

  // Check if any object has the specified property set to the target value
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "image") {
      useImageModel = true;
      break; // Stop the loop since we found a match
    }
  }

  let geminiFormattedMessages:
    (types.GeminiContentPartText | types.GeminiContentPartImage)[] = [];

  geminiFormattedMessages = await processGeminiMessages(messages);

  // Gemini message system is a motherfucker and I hate it but we gotta deal with it. Messages look like this:

  /*
              {
                'text': 'User: Whats 9 + 10?'
              },
              {
                'text': 'Model: 21'
              }
  */

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${
      useImageModel === true ? "gemini-1.0-pro-vision" : "gemini-1.0-pro"
    }:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "contents": [
          {
            "parts": geminiFormattedMessages,
          },
        ],
        "generationConfig": {
          "temperature": 0.9,
          "topK": 1,
          "topP": 1,
          "maxOutputTokens": 2048,
          "stopSequences": [],
        },
        "safetySettings": [
          {
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            "category": "HARM_CATEGORY_HATE_SPEECH",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
            "threshold": "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    },
  );

  const resp: types.geminiResponse = await res.json();

  messages.push({
    role: "assistant",
    content: resp.candidates[0].content.parts[0].text,
  });

  return {
    resp,
    messages,
  };
}
