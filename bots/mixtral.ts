import * as types from "./types.ts";

export const requested_values = {
  env: ["GROQ_API_KEY"],
};

// const db = await Deno.openKv("./db.sqlite")

export async function send(
  messages: types.Message[],
  prompt: string,
  callback: (type: string, data: types.Response) => void,
  values: types.Values,
): Promise<types.Response> {
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
      Authorization: `Bearer ${values.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mixtral-8x7b-32768",
      messages: messages,
    }),
  });

  const resp: types.Response | types.Error = await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  messages.push(resp.choices[0].message);

  callback("complete", resp);

  return resp;
}
