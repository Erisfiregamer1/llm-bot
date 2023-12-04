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
    response_format?: { type: 'text' | 'json_object' };
    seed?: number; // Only available for OpenAI models
    stop?: string | string[];
    stream?: boolean; // Enable streaming
    temperature?: number;
    top_p?: number;

    // Function-calling
    tools?: Tool[];
    tool_choice?: ToolChoice;

    // OpenRouter-only parameters
    transforms?: string[] // See "Prompt Transforms" section
    models?: string[] // See "Fallback Models" section
    route?: 'fallback' // See "Fallback Models" section
};

// Subtypes:

export type TextContent = {
    type: 'text';
    text: string;
};

export type ImageContentPart = {
    type: 'image_url';
    image_url: {
        url: string; // URL or base64 encoded image data
        detail?: string; // Optional, defaults to 'auto'
    };
};

export type ContentPart = TextContent | ImageContentPart;

export type Message = {
    role: string;
    content: string
      | ContentPart[]
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
    type: 'function';
    function: FunctionDescription;
};

export type ToolChoice = 'none' | 'auto' | {
    type: 'function';
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
    choices: (NonStreamingChoice | NonChatChoice | Error)[];
    created: number; // Unix timestamp
    model: string;
    object: 'chat.completion';
};

export type OpenAIResponse = {
    id: string;
    // Depending on whether you set "stream" to "true" and
    // whether you passed in "messages" or a "prompt", you
    // will get a different output shape
    choices: NonStreamingChoice[];
    created: number; // Unix timestamp
    model: string;
    object: 'chat.completion';
};

// Subtypes:

export type NonChatChoice = {
    finish_reason: string | null;
    text: string;
}

export type NonStreamingChoice = {
    finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
    message: {
        content: string | null;
        role: 'assistant';
        tool_calls?: ToolCall[];
        // Deprecated, replaced by tool_calls
        function_call?: FunctionCall;
    };
};

export type Error = {
  code: number; // See "Error Handling" section
  message: string;
}

export type OpenAIError = {
    error: {
    code: number; // See "Error Handling" section
    message: string;
    }
}

export type FunctionCall = {
    name: string;
    arguments: string; // JSON format arguments
};

export type ToolCall = {
    id: string;
    type: 'function';
    function: FunctionCall;
};

export function isError(
    value: OpenAIError | OpenAIResponse,
  ): value is OpenAIError {
    return "error" in value;
}