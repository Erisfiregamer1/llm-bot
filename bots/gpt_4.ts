export let isEnabled = true;

import * as types from "./types.ts"

import * as vdb from "../vdb.ts"

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

type response = {
  oaires: types.OpenAIResponse;
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

async function doTools(
  oaires: types.OpenAIResponse,
  messages: types.Message[]
): Promise<response> {
  if (oaires.choices[0].finish_reason !== "tool_calls") {
    throw "What The Shit?"
  }

  const toolCalls = oaires.choices[0].message.tool_calls!

  toolCalls.forEach((tool) => {
    if (tool.function.name === "use-database") {

    }
  })
}

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

  let resp: types.OpenAIResponse | types.OpenAIError =
    await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  let finalresp = {
    oaires: resp,
    messages
  }

  if (resp.choices[0].finish_reason === "tool_calls") {
    finalresp = await doTools(resp, messages)
  }

  messages.push(resp.choices[0].message);

  return finalresp
}
