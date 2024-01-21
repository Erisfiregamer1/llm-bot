export const isEnabled = true; // OpenRouter is always enabled as a fallback option in case the bot's screwed up

import * as types from "./types.ts";

type response = {
  oaires: types.Response;
  messages: types.Message[];
};

export async function send(
  messages: types.Message[],
  prompt: string | null,
  _userid: string, // Included in case it becomes possible to use. OpenRouter doesn't use this one.
  model: string,
  api_key: string,
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

  if (prompt !== null) {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  console.log(messages);

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

  const resp: types.Response | types.Error = await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  const finalresp: response = {
    oaires: resp,
    messages,
  };

  messages.push(resp.choices[0].message);

  return finalresp;
}
