import * as chatgpt from "./bots/chatgpt.ts";
// import * as bing_chat from "./bots/bing_chat.ts";
import * as gpt4 from "./bots/gpt_4.ts";
// import * as palm from "./bots/palm.ts";
// import * as openrouter from "./bots/openrouter.ts";

import * as types from "./bots/types.ts"

type messagedata = {
  id: string;
  messages: types.Message[]
}

type gptresponse = {
  oaires: types.OpenAIResponse;
  messages: types.Message[];
};

import "./slashcode.ts";

import client from "./client.ts";

import { ChannelType } from "npm:discord.js";

const db = await Deno.openKv("./db.sqlite");

function splitStringIntoChunks(inputString: string | null, chunkSize: number) {
  if (inputString === null) {
    // i'm going insane

    return [
      "oopsie daisy! we did a fucky wucky and gave a critical component null again >~<",
    ];
  }

  const length = inputString.length;
  const chunks = [];

  if (length <= chunkSize) {
    chunks.push(inputString);
  } else {
    for (let i = 0; i < length; i += chunkSize) {
      chunks.push(inputString.slice(i, i + chunkSize));
    }
  }

  return chunks;
}

/*
New database example:

{
  channels: [1],
  users: {
    0: {
      current_bot: "chatgpt",
      current_conversation: 0,
      conversations: {
        chatgpt: [
          {
            id: "completion-37",
            messages: [{}] // Alan, insert message object every time you finish here. Wait, Alan, are you still on the team?
          }
        ],
        openrouter: {
          api_key: "whatever_the_fuck_it_is"
          llama2: [
            {
              id: "completion-37",
              messages: [{}] // Alan, insert message object every time you finish here. Wait, Alan, are you still on the team?
            }
          ]
        }
      }
    }
  },
}
*/

client.on("messageCreate", async (message) => {
  if (message.author.bot || JSON.stringify(message.flags) === "4096") return; // The "4096" flag is the @silent flag on discord.
  if (
    message.channel.type === ChannelType.DM ||
    message.channel.id === "1083904151479652392"
  ) {
    let error = false; // Tracks if we've already pestered the user with an error / message :\

    let llm =
      (await db.get<string>(["users", message.author.id, "current_bot"])).value; // After reading the typedocs I realized this is the cleaner way to do this

    if (llm === null) {
      // They haven't used the bot before
      llm = "gpt4";
      await db.set(["users", message.author.id, "current_bot"], llm);
      await message.reply(
        "Looks like this is your first time using this bot! Run /info to learn how to use the full potential of this bot.",
      );
      error = true;
    } else if (!llm.match(/^(chatgpt|bing|bard|gpt4|llama2)$/g) && !llm.startsWith("openrouter^")) {
      // current LLM is corrupt. notify user and reset
      llm = "gpt4";
      await db.set(["users", message.author.id, "current_bot"], llm);
      await message.reply(
        "Your current LLM is corrupted or removed! We've reset you to GPT4 for now.",
      );
      error = true;
    }

    let curconv = (await db.get<number>([
      "users",
      message.author.id,
      "current_conversation",
    ])).value;

    if (curconv === null) {
      // They haven't used this LLM before
      curconv = 0;
      await db.set(
        ["users", message.author.id, "current_conversation"],
        curconv,
      );

      if (error === false) {
        await message.reply(
          "Started conversation! Use /wipe to reset this conversation.",
        );
      }
    }

    let messages;

    if (llm.startsWith("openrouter^")) {
      const llm_real = llm.split("^")

      messages = (await db.get<messagedata[]>([
        "users",
        message.author.id,
        "conversations",
        "openrouter",
        llm_real[llm_real.length - 1]
      ])).value;
    } else {
      messages = (await db.get<messagedata[]>([
        "users",
        message.author.id,
        "conversations",
        llm,
      ])).value;
    }

    if (messages === null) {
      // No conversations for this LLM.
      messages = [{
        id: "New Conversation",
        messages: [],
      }];

      if (error === false) {
        await message.reply(
          "Started conversation! Use /wipe to reset this conversation.",
        );
      }
    }

    const curmsgs = messages[curconv].messages;

    const msg = await message.reply("Sending message...");

    let resp: gptresponse;
    /*if (llm.startsWith("openrouter^")) {
      const llm_real = llm.split("^")

      const api_key = (await db.get<string>([
        "users",
        message.author.id,
        "conversations",
        "openrouter",
        "api_key"
      ])).value!;

      resp = await openrouter.send(
        curmsgs,
        message.content,
        message.author.id,
        llm_real[llm_real.length - 1],
        api_key
      )

      messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", "openrouter", llm_real[llm_real.length - 1]],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.oaires.choices[0].message.content,
          2000,
        );

        let i = 0;

        messagechunks.forEach(async (chunk) => {
          if (i <= 0) {
            await msg.edit(chunk);
            i++;
          } else {
            await message.reply(chunk);
          }
        });
    } else */
    if (llm === "chatgpt") {
      if (!chatgpt.isEnabled) {
        msg.edit(
          "This LLM isn't enabled! Please switch to a different LLM to use this bot.",
        );
        return;
      }

      try {
        resp = await chatgpt.send(
          curmsgs,
          message.content,
          message.author.id,
        );

        messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", llm],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.oaires.choices[0].message.content,
          2000,
        );

        let i = 0;

        messagechunks.forEach(async (chunk) => {
          if (i <= 0) {
            await msg.edit(chunk);
            i++;
          } else {
            await message.reply(chunk);
          }
        });
      } catch (err) {
        msg.edit(
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else if (llm === "gpt4") {
      if (!gpt4.isEnabled) {
        msg.edit(
          "This LLM isn't enabled! Please switch to a different LLM to use this bot.",
        );
        return;
      }

      /*const images: string[] = []

      message.attachments.forEach((image) => {
        images.push(image.url)
      })

      message.stickers.forEach((image) => {
        images.push(image.url)
      })*/

      try {
        resp = await gpt4.send(
          curmsgs,
          message.content,
          message.author.id,
        );

        messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", llm],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.oaires.choices[0].message.content,
          2000,
        );

        let cvalue = 0;

        messagechunks.forEach((chunk) => {
          console.log(cvalue)

          if (cvalue === 0) {
            cvalue = 1;
            msg.edit(chunk);
          } else {
            message.reply(chunk);
          }
        });
      } catch (err) {
        msg.edit(
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else {
      msg.edit("No handler for this LLM! Switch to a different one.");
      return;
    }
  }
});
