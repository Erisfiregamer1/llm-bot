import * as types from "../main.d.ts";

const tools: types.Tool[] = [{
  type: "function",
  function: {
    name: "sanitycheck",
    description:
      "Returns true, as a sanity check to make sure function support is OK. If this fails, something's fucked.",
    parameters: {
      type: "object",
      properties: {
        useless: {
          type: "string",
          description:
            "You can put whatever here, it's not going to do anything.",
        },
      },
      required: ["useless"],
    },
  },
}];

export const information: types.information = {
  llmFileVersion: "1.0",
  env: ["GROQ_API_KEY"],
  functions: true,
  functionsData: tools,
  multiModal: false,
  callbackSupport: true,
  streamingSupport: false,
  id: "llama3-groq",
  name: "Llama 3 70b (Groq)",
  description: "Meta's new flagship model. Powered by Groq!",
  highCostLLM: false,
};

// const db = await Deno.openKv("./db.sqlite")

async function doTools(
  res: types.Response,
  callback?:
    | ((information: types.callbackData, complete: boolean) => void)
    | null,
  requirements?: types.Requirements,
): Promise<types.Response> {
  if (res.choices[0].finish_reason !== "tool_calls") {
    throw "What The Shit?";
  }

  const toolCalls = res.choices[0].message.tool_calls!;

  // What if they happen to use it later?
  // deno-lint-ignore require-await
  const promises = toolCalls.map(async (tool) => {
    if (tool.function.name === "sanitycheck") {
      return {
        role: "tool",
        content: "true",
        tool_call_id: tool.id,
      };
    } else {
      return {
        role: "tool",
        content: "Unknown tool or not implemented",
        tool_call_id: tool.id,
        //};
      };
    }
  });

  // Use Promise.all to wait for all promises to resolve
  const results = await Promise.all(promises);

  results.forEach((result) => {
    res.messages.push(result);
  });

  const newres = await send(null, res.messages, callback, requirements);

  console.log(newres);

  return newres;
}

export async function send(
  prompt: string | null,
  messages: types.Message[],
  callback?:
    | ((information: types.callbackData, complete: boolean) => void)
    | null,
  requirements?: types.Requirements,
): Promise<types.Response> {
  if (!requirements?.env?.GROQ_API_KEY) {
    throw new DOMException("env.GROQ_API_KEY", "NotFoundError");
  }

  if (requirements.streaming) {
    throw new DOMException("streaming", "NotSupportedError");
  }
  // here we go

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content:
        "You are Llama, an LLM by Meta. You are running through a Discord bot named LLM Bot, by Eris.",
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
      Authorization: `Bearer ${requirements.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages: messages,
    }),
  });

  let resp: types.Response = await res.json();

  if (resp.error) {
    // Fuck.
    throw resp.error.message; // well at least they know why the fuck it crashed??
  }

  messages.push(resp.choices[0].message);

  resp.messages = messages;

  if (resp.choices[0].finish_reason === "tool_calls") {
    if (callback) {
      callback({
        toolCalls: resp.choices[0].message.tool_calls,
        data: resp.choices[0].message.content,
      }, false);
    }
    resp = await doTools(resp, null, requirements);
    resp.choices[0].message.content = resp.choices[0].message.content as string;
  }

  if (callback) callback({ data: resp.choices[0].message.content }, true);

  return resp;
}
