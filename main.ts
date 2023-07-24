import * as chatgpt from "./bots/chatgpt.ts";
import * as bing_chat from "./bots/bing_chat.ts";
import * as gpt4 from "./bots/gpt_4.ts";
import * as palm from "./bots/palm.ts";

import client from "./client.ts"

import "./slashcode.ts"

import { keyv } from "./db.ts";

import { ChannelType } from "npm:discord.js";

if ((await keyv.get("setup")) !== 26) {
  const map = new Map();
  const set = new Set();
  await keyv.set("channels", JSON.stringify([...set]));
  await keyv.set("userbotmap", JSON.stringify([...map]));
  await keyv.set("userdbmap", JSON.stringify([...map]));
  await keyv.set("chatgptobject", JSON.stringify({}));
  await keyv.set("chatgptcmap", JSON.stringify([...map])); // Shut up. It works.
  await keyv.set("bingobject", JSON.stringify({}));
  await keyv.set("bingcmap", JSON.stringify([...map])); // I know this is a dumb way to do it, but it works.
  await keyv.set("gpt4object", JSON.stringify({}));
  await keyv.set("gpt4cmap", JSON.stringify([...map])); // death
  await keyv.set("palmobject", JSON.stringify({}));
  await keyv.set("palmcmap", JSON.stringify([...map])); // this is getting old fast.

  await keyv.set("setup", 26);
  console.log("[NOTICE] Some initial setup has been completed. Old conversations have been wiped.");
}
client.on("messageCreate", async (message) => {
    if (message.author.bot || JSON.stringify(message.flags) === "4096") return; // The "4096" flag is the @silent flag on discord.
    if (message.channel.type === ChannelType.DM || new Set(JSON.parse(await keyv.get("channels"))).has(message.channel.id)) {
      let c = false;
      if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(message.author.id) === undefined) {
        message.reply("Looks like this is your first time using the bot. We've pre-configured some stuff for you and set your bot to ChatGPT. Do /info to learn how to use this bot.");
        const b = new Map(JSON.parse(await keyv.get("userbotmap"))).set(message.author.id, "chatgpt");
        keyv.set("userbotmap", JSON.stringify([...b]));
        c = true;
      }
  
      const reply: Record<string, unknown> = {};
  
      try {
        const repliedTo = await message.fetchReference();
        reply.username = repliedTo.author.username;
  
        console.log(repliedTo.author);
  
        if (repliedTo.author.username === "LLM Bot" && repliedTo.author.discriminator === "2619") {
          reply.username = "you";
        }
        reply.content = repliedTo.content;
      } catch (_err) {
        // Do nothing
      }
  
      if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(message.author.id) === "chatgpt" || c === true) {
        if (c === false) {
          if (new Map(JSON.parse(await keyv.get("chatgptcmap"))).get(message.author.id) === undefined) {
            const b = new Map(JSON.parse(await keyv.get("chatgptcmap"))).set(message.author.id, 0);
            await keyv.set("chatgptcmap", JSON.stringify([...b]));
          }
  
          if (JSON.parse(await keyv.get("chatgptobject"))[message.author.id] === undefined) {
            const newobj = JSON.parse(await keyv.get("chatgptobject"));
            newobj[message.author.id] = [];
            await keyv.set("chatgptobject", JSON.stringify(newobj));
          }

          const s: Map<string, number> = new Map(JSON.parse(await keyv.get("chatgptcmap")))

          const mapres = s.get(message.author.id) as number
  
          if (JSON.stringify(JSON.parse(await keyv.get("chatgptobject"))[message.author.id]) === JSON.stringify([])) {
            message.reply("You have no conversations! A new one will be made for you.");
          } else if (JSON.parse(await keyv.get("chatgptobject"))[message.author.id][mapres].last_used === "null") {
            message.reply("Conversation started! Do /wipe to reset it.");
          }
        }
  
        const msgobj = await message.reply("Sending message...");
        const res = await chatgpt.send(message.content, message.author.id);
        if (Array.isArray(res.resp)) {
          let i = 0;
          res.resp.forEach(async (element) => {
            if (i === 0) {
              i++;
              await msgobj.edit(element);
            } else {
              await message.reply(element);
            }
          });
        } else {
          msgobj.edit(res.resp);
        }
      } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(message.author.id) === "bing_chat") {
        const s: Map<string, number> = new Map(JSON.parse(await keyv.get("bingcmap")))

        const mapres = s.get(message.author.id) as number

        if (JSON.parse(await keyv.get("bingobject"))[message.author.id] === undefined) {
          // Just do nothing.
        } else if (JSON.stringify(JSON.parse(await keyv.get("bingobject"))[message.author.id]) === JSON.stringify([])) {
          message.reply("You have no conversations! A new one will be made for you.");
        } else if (JSON.parse(await keyv.get("bingobject"))[message.author.id][mapres].last_used === "null") {
          message.reply("Conversation started! Do /wipe to reset it.");
        }
  
        const msgobj = await message.reply("Sending message...");
        const res = await bing_chat.send(message.content, message.author.id);
        if (Array.isArray(res)) {
          let i = 0;
          res.forEach(async (element) => {
            if (i === 0) {
              i++;
              await msgobj.edit(element);
            } else {
              await message.reply(element);
            }
          });
        } else {
          msgobj.edit(res);
        }
      } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(message.author.id) === "gpt4") {
        if (new Map(JSON.parse(await keyv.get("gpt4cmap"))).get(message.author.id) === undefined) {
          const b = new Map(JSON.parse(await keyv.get("gpt4cmap"))).set(message.author.id, 0);
          await keyv.set("gpt4cmap", JSON.stringify([...b]));
        }
  
        if (JSON.parse(await keyv.get("gpt4object"))[message.author.id] === undefined) {
          const newobj = JSON.parse(await keyv.get("gpt4object"));
          newobj[message.author.id] = [];
          await keyv.set("gpt4object", JSON.stringify(newobj));
        }

        const s: Map<string, number> = new Map(JSON.parse(await keyv.get("gpt4cmap")))

        const mapres = s.get(message.author.id) as number
        
        // )).get(message.author.id)
  
        if (JSON.stringify(JSON.parse(await keyv.get("gpt4object"))[message.author.id]) === JSON.stringify([])) {
          message.reply("You have no conversations! A new one will be made for you.");
        } else if (JSON.parse(await keyv.get("gpt4object"))[message.author.id][mapres].last_used === "null") {
          message.reply("Conversation started! Do /wipe to reset it.");
        }
  
        const msgobj = await message.reply("Sending message...");
        const res = await gpt4.send(message.content, message.author.id);
  
        console.log(res.resp);
  
        if (Array.isArray(res.resp)) {
          let i = 0;
          res.resp.forEach(async (element) => {
            if (i === 0) {
              i++;
              await msgobj.edit(element);
            } else {
              await message.reply(element);
            }
          });
        } else {
          msgobj.edit(res.resp);
        }
      } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(message.author.id) === "palm") {
        const s: Map<string, number> = new Map(JSON.parse(await keyv.get("palmcmap")))

        const mapres = s.get(message.author.id) as number

        if (JSON.parse(await keyv.get("palmobject"))[message.author.id] === undefined) {
          // Just do nothing
        } else if (JSON.stringify(JSON.parse(await keyv.get("palmobject"))[message.author.id]) === JSON.stringify([])) {
          message.reply("You have no conversations! A new one will be made for you.");
        } else if (JSON.parse(await keyv.get("palmobject"))[message.author.id][mapres].last_used === "null") {
          message.reply("Conversation started! Do /wipe to reset it.");
        }
  
        const msgobj = await message.reply("Sending message...");
        const res = await palm.send(message.content, message.author.id);
        if (Array.isArray(res.resp)) {
          let i = 0;
          res.resp.forEach(async (element: string) => {
            if (i === 0) {
              i++;
              await msgobj.edit(element);
            } else {
              await message.reply(element);
            }
          });
        } else {
          msgobj.edit(res.resp);
        }
      }
    }
  });
  
  console.log("The bot is now online!");
  

