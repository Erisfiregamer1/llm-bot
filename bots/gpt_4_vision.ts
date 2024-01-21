export let isEnabled = true;

import * as types from "./types.ts";

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

type response = {
  oaires: types.Response;
  messages: types.Message[];
};

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: types.Message[],
  prompt: string | null,
  userid: string,
  images: string[],
): Promise<response> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: [{
        type: "text",
        text: "You are ChatGPT, an LLM by OpenAI.",
      }],
    });
  }

  const prompt_data: types.ContentPart[] = [];

  if (prompt !== null) {
    prompt_data.push({
      type: "text",
      text: prompt,
    });
  }

  images.forEach((image_url) => {
    prompt_data.push({
      type: "image_url",
      image_url: {
        url: image_url,
      },
    });
  });

  messages.push({
    role: "user",
    content: prompt_data,
  });

  console.log(messages);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: messages,
      user: userid,
    }),
  });

  const resp: types.Response | types.Error = await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  let finalresp: response = {
    oaires: resp,
    messages,
  };

  messages.push(resp.choices[0].message);

  return finalresp;
}
