import * as types from "../main.d.ts";

export const information: types.information = {
  llmFileVersion: "1.0",
  env: ["GROQ_API_KEY"],
  functions: false,
  multiModal: false,
  callbackSupport: true,
  streamingSupport: false,
  id: "mixtral-groq",
  name: "Mixtral (Groq)",
  description: "Mistral's MOE model. Powered by Groq!",
  highCostLLM: false
};

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  prompt: string | null,
  messages: types.Message[],
  callback?:
    | ((information: types.callbackData, complete: boolean) => void)
    | null,
  requirements?: types.Requirements,
): Promise<types.Response> {
  if (!requirements?.env?.GROQ_API_KEY) {
    throw new DOMException("env.GROQ_API_KEY", "NotFoundError");
  }

  if (requirements.streaming) {
    throw new DOMException("streaming", "NotSupportedError");
  }
  // here we go

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are Mixtral, an LLM by Mistral AI. You are running through a Discord bot named LLM Bot, by Eris.",
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requirements.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: messages,
    }),
  });

  const resp: types.Response = await res.json();

  if (resp.error) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  messages.push(resp.choices[0].message);

  resp.messages = messages;

  if (callback) callback({ data: resp.choices[0].message.content }, true);

  return resp;
}
