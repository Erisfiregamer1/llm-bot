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
    query: {
      type: "string",
      description: "Request to send to database"
    }
  },
  required: ["query"]
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

  const promises = toolCalls.map(async (tool) => {
    if (tool.function.name === "use-database") {
      const databaseResponse = await vdb.getRelevantDocument(JSON.parse(tool.function.arguments).query);

      return {
        role: "tool",
        content: databaseResponse,
        tool_call_id: tool.id,
      };
    } else {
      return {
        role: "tool",
        content: "Unknown tool or not implemented",
        tool_call_id: tool.id
      }
    }
  });

  // Use Promise.all to wait for all promises to resolve
  const results = await Promise.all(promises);

  results.forEach((result) => {
    messages.push(result)
  })

    const newres = await send(messages, null, "tool_res")

    console.log(newres)

    return newres
  }

export async function send(
  messages: types.Message[],
  prompt: string | null,
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

  if (prompt !== null) {

  messages.push({
    role: "user",
    content: prompt,
  });

 }

 console.log(messages)

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4-1106-preview",
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

  let finalresp: response = {
    oaires: resp,
    messages
  }

  messages.push(resp.choices[0].message);

  if (resp.choices[0].finish_reason === "tool_calls") {
    finalresp = await doTools(resp, messages)
  }


  return finalresp
}
