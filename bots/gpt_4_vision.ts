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
  env: ["OPENAI_API_KEY"],
  functions: true,
  functionsData: tools,
  multiModal: true,
  callbackSupport: true,
  streamingSupport: false,
  id: "gpt4v",
  name: "GPT-4 Vision",
  description: "A further upgraded version of GPT-4 with vision capabilities.",
  highCostLLM: true,
};

async function doTools(
  res: types.Response,
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

  const newres = await send("", res.messages);

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
  if (!requirements?.env?.OPENAI_API_KEY) {
    throw new DOMException("env.OPENAI_API_KEY", "NotFoundError");
  }

  if (requirements.streaming) {
    throw new DOMException("streaming", "NotSupportedError");
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

  requirements.images?.forEach((image_url) => {
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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requirements?.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: messages,
    }),
  });

  let resp: types.Response = await res.json();

  if (resp.error) {
    throw new DOMException(resp.error.message, "ExecutionError");
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
    resp = await doTools(resp);
    resp.choices[0].message.content = resp.choices[0].message.content as string;
  }

  if (callback) callback({ data: resp.choices[0].message.content }, true);

  return resp;
}
