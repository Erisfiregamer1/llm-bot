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
  id: "gpt4o",
  name: "GPT-4 Omni",
  description: "OpenAI's most powerful model, with heightened multimodal capabilities!",
  highCostLLM: true,
};

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
        text: "You are GPT-4 Omni, an LLM by OpenAI.",
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

  if (prompt_data.length !== 0) {
  messages.push({
    role: "user",
    content: prompt_data,
  });

    
}

  // Make sure all existing images are valid (if any)
  // Things to check:
  // - Image still exists (discord's image storage is volatile)
  // - Image is png, jpg, gif or webp

  messages = await Promise.all(messages.map(async (message) => {
    message.content = message.content as types.ContentPart[];

    if (!Array.isArray(message.content)) {
      return message
    }

    if (message.content.length === 0) {
      return message
    }

    message.content = await Promise.all(message.content.map(async (part): Promise<types.ImageContentPart | types.TextContent> => {
      if (part.type === "image_url") {
        const imageData = await fetch(part.image_url.url)

        if (imageData.status !== 200) {
          message.role === "system"
          return {
            type: "text",
            text: "There was an image here, but it no longer exists. Ask the user to resend it if you need it."
          }
        }

        if (!imageData.headers.get("content-type")?.startsWith("image/")) {
          message.role === "system"
          return {
            type: "text",
            text: "There was an image here, but it was not a valid image. Ask the user to resend it if you need it."
          }
        }

        if (
          !part.image_url.url.endsWith(".png") &&
          !part.image_url.url.endsWith(".jpg") &&
          !part.image_url.url.endsWith(".gif") &&
          !part.image_url.url.endsWith(".webp"))
        {
          message.role === "system"
          return {
            type: "text",
            text: `There was an image here, but it was not a valid image format! Ask the user to resend in either .png, .jpg, .gif or .webp format. The image format was ${imageData.headers.get("content-type")?.split("/")[1]}.`
          }
        }

        return part
      } else {
        return part
      }
    }))

    return message
  }))

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${requirements?.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: messages,
      tools,
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
    resp = await doTools(resp, null, requirements);
    resp.choices[0].message.content = resp.choices[0].message.content as string;
  }

  if (callback) callback({ data: resp.choices[0].message.content }, true);

  return resp;
}
