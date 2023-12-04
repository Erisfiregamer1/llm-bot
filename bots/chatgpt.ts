export let isEnabled = true;

import * as types from "./types.ts"

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

type response = {
  oaires: types.Response;
  messages: types.Message[];
};

// const db = await Deno.openKv("./db.sqlite")

const tools: types.Tool[] = [{
  type: "function",
  function: {
    name: "use-database",
    description: "Check the Vector Database for information on a subject. Irrelevant data means no relevant data is available.",
    parameters: {
      type: "object",
  properties: {
    test: {
      type: "string",
      description: "This is the 'test' parameter."
    }
  },
  required: ["test"]
    }
  }
}]

/*async function doTools(

): Promise<response> {

}*/

export async function send(
  messages: types.Message[],
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
      tools
    }),
  });

  const resp: types.OpenAIResponse | types.OpenAIError =
    await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  if (types.isStreaming(resp.choices[0])) {
    throw "oh no"
  }

  if (resp.choices[0].finish_reason === "tool_calls") {
    // Do nothing for now. Bot should complain about passing critical component null again
  }

  messages.push(resp.choices[0].message);

  return {
    oaires: resp,
    messages,
  };
}
