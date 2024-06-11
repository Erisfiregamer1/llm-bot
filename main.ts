/// <reference lib="deno.unstable" />

import { existsSync, walk } from "https://deno.land/std@0.221.0/fs/mod.ts";

import importLLMFile from "./lib/importLLMFile.ts";

if (!existsSync("./bots")) {
  throw new DOMException(
    "Add the /bots directory and populate it with LLMFiles to use the bot! As an example, copy the directory from the Github.",
    "NoLLMsAddedError",
  );
}

for await (const entry of await walk("./bots")) {
  if (entry.isFile && entry.name.endsWith(".ts")) {
    await importLLMFile(
      entry.path,
    );
  }
}

console.log("LLMs initialized.")

import * as types from "./main.d.ts";

type messageData = {
  id: string;
  messages: types.Message[];
};

import client from "./client.ts";

console.log(
  "Everything looks good!",
  Object.keys(availableLLMs).length,
  "LLMs were imported.",
);

await import("./slashcode.ts");

import { ChannelType, Message } from "npm:discord.js";

const db = await Deno.openKv("./db.sqlite");

function splitStringIntoChunks(
  inputString: string,
  chunkSize: number = 1999,
): string[] {
  const lines: string[] = inputString.split("\n");
  const chunks: string[] = [];
  let currentChunk: string = "";

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = line;
    } else {
      if (currentChunk) {
        currentChunk += "\n";
      }
      currentChunk += line;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
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
        ]
      }
    }
  },
}
*/

const getImagesFromMessage = async (message: Message<boolean>) => {
  const images: string[] = [];

  // Process attachments
  message.attachments.forEach((image) => {
    images.push(image.url);
  });

  // Process URLs in message content
  const regx = message.content.match(
    /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i,
  );

  if (regx) {
    // Use Promise.all to wait for all asynchronous operations to complete
    const resultArray = await Promise.all(regx.map(async (link) => {
      const isImage = (await fetch(link)).headers.get("Content-Type")
        ?.startsWith("image/");
      if (isImage) {
        console.log(link);
        message.content.replace(link, "");
        return link;
      }
      return null;
    }));

    const filteredImages: string[] = [];

    resultArray.forEach((link) => {
      if (link !== null) filteredImages.push(link);
    });

    images.push(...filteredImages);
  }

  // Process stickers
  message.stickers.forEach((sticker) => {
    images.push(sticker.url);
  });

  return images;
};

client.on("messageCreate", async (message) => {
  let isBotChannel = (await db.get<boolean>([
    "channels",
    message.channel.id,
  ])).value;

  if (isBotChannel === null) {
    await db.set(
      ["channels", message.channel.id],
      false,
    );

    isBotChannel = false;
  }

  if (message.author.bot || JSON.stringify(message.flags) === "4096") return; // The "4096" flag is the @silent flag on discord.
  if (
    message.channel.type === ChannelType.DM ||
    isBotChannel
  ) {
    let error = false; // Tracks if we've already pestered the user with an error / message :\

    const llm =
      (await db.get<string>(["users", message.author.id, "current_bot"])).value; // After reading the typedocs I realized this is the cleaner way to do this

    if (llm === null) {
      await message.reply(
        "Looks like this is your first time using this bot! Run /info to learn how to use the full potential of this bot, and set your desired LLM using /set-ai!",
      );
      error = true;
      return;
    } else if (
      !Object.prototype.hasOwnProperty.call(availableLLMs, llm)
    ) {
      // current LLM is removed/corrupted
      await message.reply(
        "Your current LLM is corrupted or removed! Set a new LLM at /set-ai!",
      );
      return;
    }

    if (
      availableLLMs[llm].information.highCostLLM &&
      Deno.env.get("PREMIUM_ENFORCEMENT") === "true"
    ) {
      const guild = client.guilds.resolve(Deno.env.get("PRIMARY_GUILD") || "0");
      if (guild) {
        const member = await guild?.members.fetch(message.author.id);
        if (
          !member.premiumSince &&
          Deno.env.get("PRIMARY_GUILD") !== message.guild?.id
        ) {
          message.reply(
            "This LLM is for premium users only! Boost the server to gain access to this LLM, or join the bot host's primary server!",
          );
          return;
        }
      } else {
        message.reply(
          "your developer is terrible at his job (Premium lock config not set properly! This LLM is marked as high-cost, have the owner of the bot finish setup.)",
        );
        return;
      }
    }

    let isMessageProcessing = (await db.get<boolean>([
      "users",
      message.author.id,
      "messageWaiting",
    ])).value;

    if (isMessageProcessing) {
      try {
        await message.delete();
        return;
      } catch (_err) {
        await message.reply("A message is already being processed!");
        return;
      }
    } else {
      isMessageProcessing = true;

      await db.set(
        ["users", message.author.id, "messageWaiting"],
        isMessageProcessing,
      );
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
        error = true;
      }
    }

    let messages = (await db.get<messageData[]>([
      "users",
      message.author.id,
      "conversations",
      llm,
    ])).value!;

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

    const requirements = availableLLMs[llm].information;

    const reqobject: types.Requirements = {};

    if (requirements.multiModal) {
      const images: string[] = await getImagesFromMessage(message);

      reqobject.images = images;
    }

    if (requirements.env) {
      reqobject.env = {};

      requirements.env.forEach((envValue) => {
        if (!Deno.env.get(envValue)) {
          throw `Required env value "${envValue}" not found, add it to .env!`;
        }

        reqobject.env![envValue] = Deno.env.get(envValue)!;
      });
    }

    reqobject.streaming = false; // No.
  
    try {
      const resp = await availableLLMs[llm].send(
        message.content,
        curmsgs,
        null,
        reqobject,
      );

      messages[curconv].messages = resp.messages;

      await db.set(
        ["users", message.author.id, "conversations", llm],
        messages,
      );

      const messagechunks = splitStringIntoChunks(
        resp.choices[0].message.content!,
        2000,
      );

      let cvalue = 0;

      messagechunks.forEach((chunk) => {
        if (cvalue === 0) {
          cvalue = 1;
          isMessageProcessing = false;

          db.set(
            ["users", message.author.id, "messageWaiting"],
            isMessageProcessing,
          );
          msg.edit(chunk);
        } else {
          message.reply(chunk);
        }
      });
    } catch (err) {
      isMessageProcessing = false;

      db.set(
        ["users", message.author.id, "messageWaiting"],
        isMessageProcessing,
      );
      msg.edit(
        "LLM threw an error in processing! Contact the admins to have them handle and report the bug.",
      );
      console.error(
        `Model ${llm} threw an error! If you can't understand the error, contact the developer (Eris) for help. Error:`,
        err,
      );
      return;
    }
  }
});
