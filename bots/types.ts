// Definitions of subtypes are below

export type Request = {
  // Either "messages" or "prompt" is required
  messages?: Message[];
  prompt?: string;

  // If "model" is unspecified, uses the user's default
  model?: string; // See "Supported Models" section

  // Additional optional parameters
  frequency_penalty?: number;
  logit_bias?: { [key: number]: number }; // Only available for OpenAI models
  max_tokens?: number; // Required for some models, so defaults to 512
  n?: number;
  presence_penalty?: number;
  response_format?: { type: "text" | "json_object" };
  seed?: number; // Only available for OpenAI models
  stop?: string | string[];
  stream?: boolean; // Enable streaming
  temperature?: number;
  top_p?: number;

  // Function-calling
  tools?: Tool[];
  tool_choice?: ToolChoice;

  // OpenRouter-only parameters
  transforms?: string[]; // See "Prompt Transforms" section
  models?: string[]; // See "Fallback Models" section
  route?: "fallback"; // See "Fallback Models" section
};

// Subtypes:

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

export type AnthropicTextContent = {
  type: "text";
  text: string;
};

export type AnthropicImageContentPart = {
  type: "image";
  source: {
    type: "base64";
    media_type: string;
    data: string;
  };
};

export type AnthropicContentPart =
  | AnthropicTextContent
  | AnthropicImageContentPart;

export type Message = {
  role: string;
  content:
    | string
    | ContentPart[]
    | AnthropicContentPart[]
    | null;
  name?: string;
  tool_call_id?: string;
};

export type FunctionDescription = {
  description?: string;
  name: string;
  parameters: object; // JSON Schema object
};

export type Tool = {
  type: "function";
  function: FunctionDescription;
};

export type ToolChoice = "none" | "auto" | {
  type: "function";
  function: {
    name: string;
  };
};

// Definitions of subtypes are below

export type Response = {
  id: string;
  // Depending on whether you set "stream" to "true" and
  // whether you passed in "messages" or a "prompt", you
  // will get a different output shape
  choices: Choice[]; // LLM Bot will NEVER pass a streaming/nonchat choice so...
  created: number; // Unix timestamp
  model: string;
  object: "chat.completion";
};
// Subtypes:
export type Choice = {
  finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
  message: {
    content: string | null;
    role: "assistant";
    tool_calls?: ToolCall[];
    // Deprecated, replaced by tool_calls
    function_call?: FunctionCall;
  };
};

export type Error = {
  error: {
    code: number; // See "Error Handling" section
    message: string;
  };
};

export type FunctionCall = {
  name: string;
  arguments: string; // JSON format arguments
};

export type ToolCall = {
  id: string;
  type: "function";
  function: FunctionCall;
};

export function isError(
  value: Error | Response | claudeResponse,
): value is Error {
  return "error" in value;
}

// ChatGPT'd types ahead, expect problems

type GeminiSafetyRating = {
  category:
    | "HARM_CATEGORY_SEXUALLY_EXPLICIT"
    | "HARM_CATEGORY_HATE_SPEECH"
    | "HARM_CATEGORY_HARASSMENT"
    | "HARM_CATEGORY_DANGEROUS_CONTENT";
  probability: "NEGLIGIBLE";
};

export type GeminiContentPartText = {
  text: string;
};

export type GeminiContentPartImage = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type GeminiContent = {
  parts: GeminiContentPartText[];
  role: string;
};

type GeminiCandidate = {
  content: GeminiContent;
  finishReason: string;
  index: number;
  safetyRatings: GeminiSafetyRating[];
};

type GeminiPromptFeedback = {
  safetyRatings: GeminiSafetyRating[];
};

export type geminiResponse = {
  candidates: GeminiCandidate[];
  promptFeedback: GeminiPromptFeedback;
};

export type Values = {
  env: {
    [envValue: string]: string;
  };
  images?: string[]; // PLEASE. VALIDATE THESE ARE IMAGE URLS WITH CONTENT. FOR THE LOVE OF GOD.
};

// GPT'd types probably stopped here

export type llmFileResponse = {
  resp: Response | geminiResponse | claudeResponse;
  messages: Message[];
};

export type llmFileResponseGPT = {
  resp: Response;
  messages: Message[];
};

export type llmFileResponseGemini = {
  resp: geminiResponse;
  messages: Message[];
};

export type llmFileResponseClaude = {
  resp: claudeResponse;
  messages: Message[];
};

export type claudeResponse = {
  content: Array<{
    text: string;
    type: string;
  }>;
  id: string;
  model: string;
  role: string;
  stop_sequence: string;
  type: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};
