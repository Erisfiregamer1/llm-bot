export let isEnabled = true;

import * as types from "./types.ts";

import * as vdb from "../vdb.ts";

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.");
  isEnabled = false;
}

// const db = await Deno.openKv("./db.sqlite")

const tools: types.Tool[] = [{
  type: "function",
  function: {
    name: "use-database",
    description:
      "Check the Vector Database for information on a subject. Irrelevant data means no relevant data is available.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Request to send to database",
        },
      },
      required: ["query"],
    },
  },
}];

async function doTools(
  res: types.Response,
  messages: types.Message[],
): Promise<types.Response> {
  if (res.choices[0].finish_reason !== "tool_calls") {
    throw "What The Shit?";
  }

  const toolCalls = res.choices[0].message.tool_calls!;

  const promises = toolCalls.map(async (tool) => {
    if (tool.function.name === "use-database") {
      const databaseResponse = await vdb.getRelevantDocument(
        JSON.parse(tool.function.arguments).query,
      );

      return {
        role: "tool",
        content: databaseResponse,
        tool_call_id: tool.id,
      };
    } else {
      return {
        role: "tool",
        content: "Unknown tool or not implemented",
        tool_call_id: tool.id,
      };
    }
  });

  // Use Promise.all to wait for all promises to resolve
  const results = await Promise.all(promises);

  results.forEach((result) => {
    messages.push(result);
  });

  const newres = await send(messages, null, "tool_res");

  console.log(newres.resp);

  return newres.resp;
}

export async function send(
  messages: types.Message[],
  prompt: string | null,
  userid: string,
): Promise<types.llmFileResponseGPT> {
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

  console.log(messages);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "gpt-4-turbo-preview",
      messages: messages,
      user: userid,
      tools,
    }),
  });

  let resp: types.Response | types.Error = await res.json();

  if (types.isError(resp)) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  messages.push(resp.choices[0].message);

  if (resp.choices[0].finish_reason === "tool_calls") {
    resp = await doTools(resp, messages);
  }

  return {
    resp,
    messages,
  };
}
