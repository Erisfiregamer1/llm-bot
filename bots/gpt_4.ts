import OpenAI from "npm:openai";

import { config } from "npm:dotenv";
config();

export let isEnabled = true;

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! GPT-4 will be unavailable.");
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

function isError(
  value: ChatCompletionError | OpenAI.Chat.Completions.ChatCompletion,
): value is ChatCompletionError {
  return "error" in value;
}

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: OpenAI.Chat.ChatCompletionMessage[],
  prompt: string,
  userid: string,
  images: string[]
): Promise<response> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled"; // how did you get here.
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: "You are GPT-4, an LLM by OpenAI.",
    });
  }

  const content_arr = []

  content_arr.push({
    type: "text",
    text: prompt
  })

  if (images.length !== 0) {


    images.forEach((imgurl) => {
      content_arr.push({
        type: "image_url",
        image_url: imgurl
      })
    })
  }

  messages.push({
    role: "user",
    content: content_arr, // how do I force update type definitions again?!
  });



  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      max_tokens: 4096,
      model: "gpt-4-vision-preview",
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
