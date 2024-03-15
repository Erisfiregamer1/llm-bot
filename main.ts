/// <reference lib="deno.unstable" />

import * as chatgpt from "./bots/chatgpt.ts";
// import * as bing_chat from "./bots/bing_chat.ts";
import * as gpt4 from "./bots/gpt_4.ts";
import * as gpt4_v from "./bots/gpt_4_vision.ts";
import * as gemini from "./bots/gemini.ts";
import * as mixtral from "./bots/mixtral.ts";
import * as claude3 from "./bots/claude_3.ts";

import * as types from "./bots/types.ts";

type messagedata = {
  id: string;
  messages: types.Message[];
};

import "./slashcode.ts";

import client from "./client.ts";

import { AnyThreadChannel, ChannelType, Message } from "npm:discord.js";

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
    } else if (
      !llm.match(/^(chatgpt|bing|gemini|gpt4|gpt4_v|mixtral|claude3)$/g)
    ) {
      // current LLM is corrupt. notify user and reset
      llm = "gpt4";
      await db.set(["users", message.author.id, "current_bot"], llm);
      await message.reply(
        "Your current LLM is corrupted or removed! We've reset you to GPT4 for now.",
      );
      error = true;
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

    let messages = (await db.get<messagedata[]>([
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

    let resp: types.llmFileResponse;
    if (llm === "chatgpt") {
      if (!chatgpt.isEnabled) {
        msg.edit(
          "This LLM isn't enabled! Please switch to a different LLM to use this bot.",
        );
        return;
      }

      let thread: AnyThreadChannel<boolean>;

      let useThread = false;

      // deno-lint-ignore no-inner-declarations
      async function cbfunction(type: string, resp: types.Response) {
        console.log(resp);
        if (type === "function") {
          if (!useThread) {
            useThread = true;

            thread = await msg.startThread({
              name: crypto.randomUUID(),
            });

            msg.edit("Check the thread for the bot's response!");
          }

          console.log(resp.choices[0].message.content);

          thread.send(
            `${
              (resp.choices[0].message.content !== null)
                ? `${resp.choices[0].message.content}\n[used function "${
                  resp.choices[0].message.tool_calls![0].function.name
                }"]\n`
                : `[used function "${
                  resp.choices[0].message.tool_calls![0].function.name
                }"]\n`
            }`,
          );
        } else if (type === "complete") {
          if (useThread === true) {
            thread.send(resp.choices[0].message.content!);
          } else {
            msg.edit(resp.choices[0].message.content!);
          }

          isMessageProcessing = false;

          db.set(
            ["users", message.author.id, "messageWaiting"],
            isMessageProcessing,
          );
        }
      }

      try {
        await chatgpt.send(
          curmsgs,
          message.content,
          message.author.id,
          cbfunction,
        );
      } catch (err) {
        isMessageProcessing = false;

        db.set(
          ["users", message.author.id, "messageWaiting"],
          isMessageProcessing,
        );
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

      try {
        resp = await gpt4.send(
          curmsgs,
          message.content,
          message.author.id,
        );

        resp.resp = resp.resp as types.Response; // shut the fuck up TypeScript

        messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", llm],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.resp.choices[0].message.content,
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
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else if (llm === "gpt4_v") {
      const images: string[] = await getImagesFromMessage(message);

      if (!gpt4.isEnabled) {
        msg.edit(
          "This LLM isn't enabled! Please switch to a different LLM to use this bot.",
        );
        return;
      }

      try {
        resp = await gpt4_v.send(
          curmsgs,
          message.content,
          message.author.id,
          images,
        );

        resp.resp = resp.resp as types.Response; // shut the fuck up TypeScript

        messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", llm],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.resp.choices[0].message.content,
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
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else if (llm === "gemini") {
      const images: string[] = await getImagesFromMessage(message);

      if (!gemini.isEnabled) {
        msg.edit(
          "This LLM isn't enabled! Please switch to a different LLM to use this bot.",
        );
        return;
      }

      console.log(images);

      try {
        resp = await gemini.send(
          curmsgs,
          message.content,
          images,
        );

        resp.resp = resp.resp as types.geminiResponse; // shut the fuck up TypeScript

        messages[curconv].messages = resp.messages;

        await db.set(
          ["users", message.author.id, "conversations", llm],
          messages,
        );

        const messagechunks = splitStringIntoChunks(
          resp.resp.candidates[0].content.parts[0].text,
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
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else if (llm === "mixtral") {
      let thread: AnyThreadChannel<boolean>;

      let useThread = false;

      try {
        await mixtral.send(
          curmsgs,
          message.content,
          async (type: string, resp: types.Response) => {
            console.log(resp);
            if (type === "function") {
              if (!useThread) {
                useThread = true;

                thread = await msg.startThread({
                  name: crypto.randomUUID(),
                });

                msg.edit("Check the thread for the bot's response!");
              }

              console.log(resp.choices[0].message.content);

              thread.send(
                `${
                  (resp.choices[0].message.content !== null)
                    ? `${resp.choices[0].message.content}\n[used function "${
                      resp.choices[0].message.tool_calls![0].function.name
                    }"]\n`
                    : `[used function "${
                      resp.choices[0].message.tool_calls![0].function.name
                    }"]\n`
                }`,
              );
            } else if (type === "complete") {
              if (useThread === true) {
                const messagechunks = splitStringIntoChunks(
                  resp.choices[0].message.content!,
                  2000,
                );

                messagechunks.forEach((chunk) => {
                  thread.send(chunk);
                });

                isMessageProcessing = false;

                db.set(
                  ["users", message.author.id, "messageWaiting"],
                  isMessageProcessing,
                );
              } else {
                const messagechunks = splitStringIntoChunks(
                  resp.choices[0].message.content!,
                  2000,
                );

                let cvalue = 0;

                messagechunks.forEach((chunk) => {
                  if (cvalue === 0) {
                    cvalue = 1;
                    msg.edit(chunk);
                  } else {
                    message.reply(chunk);
                  }
                });

                isMessageProcessing = false;

                db.set(
                  ["users", message.author.id, "messageWaiting"],
                  isMessageProcessing,
                );
              }

              isMessageProcessing = false;

              db.set(
                ["users", message.author.id, "messageWaiting"],
                isMessageProcessing,
              );
            }
          },
          {
            env: {
              GROQ_API_KEY: Deno.env.get("GROQ_API_KEY")!,
            },
          },
        );
      } catch (err) {
        isMessageProcessing = false;

        db.set(
          ["users", message.author.id, "messageWaiting"],
          isMessageProcessing,
        );
        msg.edit(
          "Something went catastrophically wrong! Please tell the bot host to check the logs, thaaaaanks",
        );
        console.error(
          "hey dumbass this error got thrown, go check that thanks:",
          err,
        );
        return;
      }
    } else if (llm === "claude3") {
      const images: string[] = await getImagesFromMessage(message);

      try {
        await claude3.send(
          curmsgs,
          message.content,
          (type: string, resp: types.llmFileResponseClaude) => {
            console.log(resp);
            if (type === "complete") {
              const messagechunks = splitStringIntoChunks(
                resp.resp.content[0].text!,
                2000,
              );

              let cvalue = 0;

              messagechunks.forEach((chunk) => {
                if (cvalue === 0) {
                  cvalue = 1;
                  msg.edit(chunk);
                } else {
                  message.reply(chunk);
                }
              });

              isMessageProcessing = false;

              db.set(
                ["users", message.author.id, "messageWaiting"],
                isMessageProcessing,
              );
            }
          },
          {
            env: {
              ANTHROPIC_API_KEY: Deno.env.get("ANTHROPIC_API_KEY")!,
            },
            images,
          },
        );
      } catch (err) {
        isMessageProcessing = false;

        db.set(
          ["users", message.author.id, "messageWaiting"],
          isMessageProcessing,
        );
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
