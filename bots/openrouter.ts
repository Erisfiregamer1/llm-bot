import OpenAI from "npm:openai";

import { config } from "npm:dotenv";
config();

export let isEnabled = true;

type ChatCompletionError = {
  error: {
    message: string;
    type: string;
    param: null; // Not sure about this one tbh,
    code: string;
  };
};

type response = {
  oaires: OpenAI.Chat.Completions.ChatCompletion;
  messages: OpenAI.Chat.ChatCompletionMessage[];
};

function isError(
  value: ChatCompletionError | OpenAI.Chat.Completions.ChatCompletion,
): value is ChatCompletionError {
  return "error" in value;
}

const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: OpenAI.Chat.ChatCompletionMessage[],
  prompt: string,
  userid: string,
  model: string,
  api_key: string
): Promise<response> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: `You are ${model}, an LLM hosted by OpenRouter.`,
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: messages,
    }),
  });

  const resp: OpenAI.Chat.Completions.ChatCompletion | ChatCompletionError =
    await res.json();

  if (isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  messages.push(resp.choices[0].message);

  return {
    oaires: resp,
    messages,
  };
}
