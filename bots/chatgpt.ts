import OpenAI from "npm:openai";

import { config } from "npm:dotenv";
config();

export let isEnabled = true;

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

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

function isError(value: any): value is ChatCompletionError {
  return "error" in value;
}

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: OpenAI.Chat.ChatCompletionMessage[],
  prompt: string,
  userid: string,
): Promise<response> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: "You are ChatGPT, an LLM by OpenAI.",
    });
  }

  messages.push({
    role: "user",
    content: prompt,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo-16k",
      messages: messages,
      user: userid,
    }),
  });

  const resp: OpenAI.Chat.Completions.ChatCompletion | ChatCompletionError =
    await res.json();

  if (isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  console.log(resp);

  return {
    oaires: resp,
    messages,
  };
}
