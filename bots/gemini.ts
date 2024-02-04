export let isEnabled = true;

import * as types from "./types.ts";

import * as vdb from "../vdb.ts";

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

type response = {
  res: types.geminiResponse;
  messages: types.Message[];
};

type geminiMessage = {
  text: string;
};

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: types.Message[],
  prompt: string | null,
): Promise<response> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are Gemini Pro, a model created by Google. You are being proxied through Discord by a bot made by Eris. You can use basic markdown to structure your responses. Everything that follows is messages, NOT examples.",
    });
  }

  if (prompt !== null) {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  console.log(messages);

  let geminiFormattedMessages: geminiMessage[] = [];

  messages.forEach((message) => {
    if (message.role === "system") {
      geminiFormattedMessages.push({ text: `System: ${message.content}` });
    } else if (message.role === "assistant") {
      geminiFormattedMessages.push({ text: `Model: ${message.content}` });
    } else if (message.role === "user") {
      geminiFormattedMessages.push({ text: `User: ${message.content}` });
    }
  });

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${
      Deno.env.get("GEMINI_API_KEY")
    }`,
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

  console.log(JSON.stringify(resp));

  messages.push({
    role: "assistant",
    content: resp.candidates[0].content.parts[0].text,
  });

  let finalResp = {
    res: resp,
    messages,
  };

  return finalResp;
}
