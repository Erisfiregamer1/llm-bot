import { CreateChatCompletionResponse, ChatCompletionResponseMessage } from "npm:openai"

export let isEnabled = true

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.")
  isEnabled = false
}

async function send(messages: ChatCompletionResponseMessage[], prompt: string, userid: string): Promise<CreateChatCompletionResponse> {
  
}