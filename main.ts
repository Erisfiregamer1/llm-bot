import * as chatgpt from "./bots/chatgpt.ts";
import * as bing_chat from "./bots/bing_chat.ts";
import * as gpt4 from "./bots/gpt_4.ts";
import * as palm from "./bots/palm.ts";

import client from "./client.ts"

import "./slashcode.ts"

import { ChannelType } from "npm:discord.js";

const db = Deno.openKv("./db.sqlite")

client.on("messageCreate", async (message) => {
    if (message.author.bot || JSON.stringify(message.flags) === "4096") return; // The "4096" flag is the @silent flag on discord.
    if (message.channel.type === ChannelType.DM || false) { // DBTODO: Reimplement
      chatgpt.send()
    }
  });
  
  console.log("The bot is now online!");
  

