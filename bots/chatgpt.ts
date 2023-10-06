import { CreateChatCompletionResponse, ChatCompletionResponseMessage } from "npm:openai"

import { config } from "npm:dotenv";
config();

export let isEnabled = true

if (!Deno.env.get("OPENAI_API_KEY")) {
  console.warn("No OpenAI API key provided! ChatGPT will be unavailable.")
  isEnabled = false
}

type response = {
  oaires: CreateChatCompletionResponse,
  messages: ChatCompletionResponseMessage[]
}

// const db = await Deno.openKv("./db.sqlite")

export async function send(messages: ChatCompletionResponseMessage[], prompt: string, userid: string): Promise<response> {
  // here we go

  if (messages.length === 0) {
    messages.push({
      role: "system",
      content: "You are ChatGPT, an LLM by OpenAI."
    })
  }

  messages.push({
    role: "user",
    content: prompt
  })

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`
    }, 
    body: JSON.stringify({
      model: "gpt-3.5-turbo-16k",
      messages: messages,
      user: userid
    })
  })

  const resp: CreateChatCompletionResponse = await res.json()

  return {
    oaires: resp,
    messages
  }
}