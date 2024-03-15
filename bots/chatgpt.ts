export let isEnabled = true;

import * as types from "./types.ts";

import * as vdb from "../vdb.ts";

import { safeEval } from "../lib/eval.ts";

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
}, {
  type: "function",
  function: {
    name: "eval",
    description:
      "Evaluates JS code within a heavily limited sandbox (a worker with no access other then network). Times out after 10 seconds.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Code to be evaluated",
        },
      },
      required: ["code"],
    },
  },
}];

async function doTools(
  oaires: types.Response,
  messages: types.Message[],
  callback: (type: string, data: types.Response) => void,
): Promise<types.Response> {
  if (oaires.choices[0].finish_reason !== "tool_calls") {
    throw "What The Shit?";
  }

  const toolCalls = oaires.choices[0].message.tool_calls!;

  const promises = toolCalls.map(async (tool) => {
    try {

    if (tool.function.name === "use-database") {
      const databaseResponse = await vdb.getRelevantDocument(
        JSON.parse(tool.function.arguments).query,
      );

      return {
        role: "tool",
        content: databaseResponse,
        tool_call_id: tool.id,
      };
    } else if (tool.function.name === "eval") {
      const respons = await safeEval(JSON.parse(tool.function.arguments).code);
      return {
        role: "tool",
        content: respons,
        tool_call_id: tool.id,
      };
    } else {
      return {
        role: "tool",
        content: "Unknown tool or not implemented",
        tool_call_id: tool.id,
      };
    }
  } catch (err) {
    return {
      role: "tool",
      content: "Error occured processing tool!",
      tool_call_id: tool.id,
    };
  }
  });



  // Use Promise.all to wait for all promises to resolve
  const results = await Promise.all(promises);

  results.forEach((result) => {
    messages.push(result);
  });

  const newres = await send(messages, null, "tool_res", callback);

  return newres.resp;
}

export async function send(
  messages: types.Message[],
  prompt: string | null,
  userid: string,
  callback: (type: string, data: types.Response) => void,
): Promise<types.llmFileResponseGPT> {
  // here we go

  if (!isEnabled) {
    throw "not_enabled";
  }

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are ChatGPT, an LLM by OpenAI. You are running through a Discord bot named LLM Bot, by Eris.",
    });
  }

  if (prompt !== null) {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

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
    callback("function", resp);

    resp = await doTools(resp, messages, callback);
  } else {
    callback("complete", resp);
  }

  return {
    resp,
    messages,
  };
}
