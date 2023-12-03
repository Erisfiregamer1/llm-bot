// Definitions of subtypes are below

type Request = {
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

type TextContent = {
    type: 'text';
    text: string;
};

type ImageContentPart = {
    type: 'image_url';
    image_url: {
        url: string; // URL or base64 encoded image data
        detail?: string; // Optional, defaults to 'auto'
    };
};

type ContentPart = TextContent | ImageContentPart;

type Message = {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string
      | ContentPart[]; // Only for the 'user' role
    name?: string;
};

type FunctionDescription = {
    description?: string;
    name: string;
    parameters: object; // JSON Schema object
};

type Tool = {
    type: 'function';
    function: FunctionDescription;
};

type ToolChoice = 'none' | 'auto' | {
    type: 'function';
    function: {
        name: string;
    };
};

// Definitions of subtypes are below

type Response = {
    id: string;
    // Depending on whether you set "stream" to "true" and
    // whether you passed in "messages" or a "prompt", you
    // will get a different output shape
    choices: (NonStreamingChoice | StreamingChoice | NonChatChoice | Error)[];
    created: number; // Unix timestamp
    model: string;
    object: 'chat.completion';
};

// Subtypes:

type NonChatChoice = {
    finish_reason: string | null;
    text: string;
}

type NonStreamingChoice = {
    finish_reason: string | null; // Depends on the model. Ex: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call'
    message: {
        content: string | null;
        role: string;
        tool_calls?: ToolCall[];
        // Deprecated, replaced by tool_calls
        function_call?: FunctionCall;
    };
};

type StreamingChoice = {
    finish_reason: string | null;
    delta: {
        content: string | null;
        role?: string;
        tool_calls?: ToolCall[];
        // Deprecated, replaced by tool_calls
        function_call?: FunctionCall;
    };
};

type Error = {
  code: number; // See "Error Handling" section
  message: string;
}

type FunctionCall = {
    name: string;
    arguments: string; // JSON format arguments
};

type ToolCall = {
    id: string;
    type: 'function';
    function: FunctionCall;
};