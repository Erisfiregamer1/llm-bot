// These are ALL the types LLM Files can use.
// Also embeds some types for LLM Bot, if it uses any.

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContentPart = {
  type: "image_url";
  image_url: {
    url: string; // URL or base64 encoded image data
    detail?: string; // Optional, defaults to 'auto'
  };
};

export type ContentPart = TextContent | ImageContentPart;

export type Message<T = boolean> = {
  role: string;
  content: T extends true ? (string | ContentPart[] | null) : (string | null);
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON format arguments
  };
};

export type Tool = {
  type: "function";
  function: {
    description?: string;
    name: string;
    parameters: object; // JSON Schema object
  };
};

export type Response = {
  id: string;
  choices: Choice[];
  messages: Message[];
  created: number; // Unix timestamp
  model: string;
  object: "chat.completion";
  error?: {
    code: number;
    message: string;
  }; // If this is here, shit
};

export type Choice<T extends boolean = false> = {
  finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
  message: Message<T>;
};

export type information = {
  llmFileVersion: string;
  env?: string[];
  functions: boolean;
  functionsData?: Tool[];
  multiModal: boolean;
  callbackSupport: boolean;
  streamingSupport?: boolean;
  id: string;
  name: string;
  description: string;
  highCostLLM: boolean;
};

export type Requirements = {
  env?: {
    [envName: string]: string;
  };
  images?: string[];
  streaming?: boolean;
};

export type callbackData = {
  toolCalls?: ToolCall[]; // What toolcalls did the LLM do if it called tools?
  data: string | null; // Whatever the LLM said (or a chunk if streaming is on)
};

export type llmFile = {
  information: information;
  send: (
    prompt: string,
    messages: Message[],
    callback?: ((information: callbackData, complete: boolean) => void) | null,
    requirements?: Requirements,
  ) => Promise<Response>;
};

declare global {
  // deno-lint-ignore no-var
  var availableLLMs: {
    [id: string]: llmFile;
  };
}
