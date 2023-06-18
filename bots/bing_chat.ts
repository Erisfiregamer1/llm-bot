import { BingAIClient } from "npm:@waylaidwanderer/chatgpt-api";

import Keyv from "npm:keyv";

import { KeyvFile } from "npm:keyv-file"

import { keyv } from "../db.ts";

import { config } from "npm:dotenv";
config();

const sensitiveWords = ["@everyone", "nigger", "<@.*>", "nigga", "@here"];

let isEnabled = true;

let bingchat;

if (Deno.env.get("BING_COOKIE") === undefined || Deno.env.get("BING_COOKIE") === "") {
  console.log("No Bing cookie set. Bing Chat has been disabled.");
  isEnabled = false;
} else {
  try {
    bingchat = new BingAIClient({
      userToken: Deno.env.get("BING_COOKIE"),
      debug: true,
      cache: new Keyv({
        store: new KeyvFile({
            filename: "./db.json"
      }),
      namespace: "bing"
    }),
  });
  } catch (err) {
    console.log(`Bing Chat failed to start! The error was "${err}". Bing Chat has been disabled.`);
    isEnabled = false;
  }
}

async function send(message, authorid) {
  if (isEnabled === true) {
    try {
      let bingobject = JSON.parse(await keyv.get("bingobject"));
      let bingcmap = new Map(JSON.parse(await keyv.get("bingcmap")));

      if (!bingobject[authorid] || JSON.stringify(JSON.parse(await keyv.get("bingobject"))[authorid]) === JSON.stringify([])) {
        console.log("hi");
        bingobject[authorid] = [];
        bingcmap.set(authorid, 0);
        keyv.set("bingobject", JSON.stringify(bingobject));
        keyv.set("bingcmap", JSON.stringify([...bingcmap]));
        const res = await bingchat.sendMessage(message, {
          jailbreakConversationId: true,
        });
        let responseText = res.response;
        for (let i = 0; i < sensitiveWords.length; i++) {
          const regex = new RegExp(sensitiveWords[i], "gi");
          responseText = responseText.replaceAll(regex, "[REMOVED]");
        }
        let splitting = false;
        let responseTextSplit = [];
        if (responseText.length > 2000) {
          splitting = true;
          for (var i = 0; i < responseText.length; i += 2000) {
            responseTextSplit.push(responseText.substr(i, 2000)); // Add the current substring to the array
          }
        }

        if (bingobject[authorid].length === 0) {
          bingobject[authorid][0] = {};
          keyv.set("bingobject", JSON.stringify(bingobject));
        }
        bingobject[authorid][bingcmap.get(authorid)].id = res.jailbreakConversationId;
        bingobject[authorid][bingcmap.get(authorid)].id2 = res.messageId;
        bingobject[authorid][bingcmap.get(authorid)].last_used = Date.now();
        keyv.set("bingobject", JSON.stringify(bingobject));

        if (splitting) {
          return responseTextSplit;
        } else {
          return responseText;
        }
      } else {
        const res = await bingchat.sendMessage(message, {
          jailbreakConversationId: bingobject[authorid][bingcmap.get(authorid)].id,
          parentMessageId: bingobject[authorid][bingcmap.get(authorid)].id2,
        });

        let responseText = res.response;
        for (let i = 0; i < sensitiveWords.length; i++) {
          const regex = new RegExp(sensitiveWords[i], "gi");
          responseText = responseText.replaceAll(regex, "[REMOVED]");
        }
        let splitting = false;
        let responseTextSplit = [];
        if (responseText.length > 2000) {
          splitting = true;
          for (var i = 0; i < responseText.length; i += 2000) {
            responseTextSplit.push(responseText.substr(i, 2000)); // Add the current substring to the array
          }
        }

        bingobject = JSON.parse(await keyv.get("bingobject"));
        bingcmap = new Map(JSON.parse(await keyv.get("bingcmap")));

        if (bingobject[authorid].length === 0) {
          bingobject[authorid][0] = {};
          keyv.set("bingobject", JSON.stringify(bingobject));
        }
        bingobject[authorid][bingcmap.get(authorid)].id = res.jailbreakConversationId;
        bingobject[authorid][bingcmap.get(authorid)].id2 = res.messageId;
        bingobject[authorid][bingcmap.get(authorid)].last_used = Date.now();
        keyv.set("bingobject", JSON.stringify(bingobject));

        if (splitting) {
          return responseTextSplit;
        } else {
          return responseText;
        }
      }
    } catch (err) {
      console.error(`Oops, dropped a request on the floor with error "${err}"`);
      //if (err.includes("Your IP is blocked by BingAI.")) {
      //  return "The machine running the bot is blocked by Bing Chat.";
      //} else {
      return "An error occured while using Bing Chat! Try again later, the backend APIs might be down.";
      //}
    }
  } else {
    return "This LLM is not available. Please contact the admins, and/or switch your chosen LLM to a different one.";
  }
}

export { send, isEnabled };
