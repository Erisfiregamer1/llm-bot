import client from "./client.ts";

import { BingImageCreator } from "https://esm.sh/@timefox/bic-sydney@1.1.4";
import crypto from "node:crypto";

import { isEnabled as geminiIsEnabled } from "./bots/gemini.ts";
import { isEnabled as chatgptIsEnabled } from "./bots/chatgpt.ts";
import { isEnabled as bingIsEnabled } from "./bots/bing_chat.ts";
import { isEnabled as gpt4IsEnabled } from "./bots/gpt_4.ts";
import { isEnabled as gpt4vIsEnabled } from "./bots/gpt_4_vision.ts";

console.log("Loading slash commands...");

import OpenAI from "npm:openai";

type messagedata = {
  id: string;
  messages: OpenAI.Chat.ChatCompletionMessage[];
};

// import { addDocument } from "./vdb.ts";

import { config } from "npm:dotenv";
config();

import { REST } from "npm:@discordjs/rest";

import { Routes } from "npm:discord-api-types/v9";

import {
  ActionRowBuilder,
  ColorResolvable,
  EmbedBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "npm:discord.js";

const commands: SlashCommandBuilder[] = [];

const db = await Deno.openKv("./db.sqlite");

const command1 = new SlashCommandBuilder();
command1.setName("info");
command1.setDescription("Gives some information about this bot! :)");

const command2 = new SlashCommandBuilder();
command2.setName("wipe");
command2.setDescription(
  "Resets your conversation with your current AI, letting you start over.",
);

const command3 = new SlashCommandBuilder();
command3.setName("add-channel");
command3.setDescription("For server management! Make the bot use a channel.");
command3.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command3.addChannelOption((option) =>
  option.setName("channel").setDescription("Channel to add to bot").setRequired(
    true,
  )
);

const command4 = new SlashCommandBuilder();
command4.setName("remove-channel");
command4.setDescription(
  "For server management! Removes the bot from a channel.",
);
command4.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command4.addChannelOption((option) =>
  option.setName("channel").setDescription("Channel to remove from bot")
    .setRequired(true)
);

const command5 = new SlashCommandBuilder();
command5.setName("ban");
command5.setDescription(
  "Bans a user from being able to use the bot! THIS IS FOR THE BOT DEVELOPER!!!",
);
command5.addStringOption((option) =>
  option.setName("id").setDescription("UserID to send to brazil").setRequired(
    true,
  )
);

const command6 = new SlashCommandBuilder();
command6.setName("unban");
command6.setDescription(
  "Unbans a user from the bot! THIS IS FOR THE BOT DEVELOPER!!!",
);
command6.addStringOption((option) =>
  option.setName("id").setDescription("UserID to remove from brazil")
    .setRequired(true)
);

const command7 = new SlashCommandBuilder();
command7.setName("remove-conversation");
command7.setDescription("Removes a conversation from your list.");

const command8 = new SlashCommandBuilder();
command8.setName("set-conversation");
command8.setDescription("Choose which conversation you are using.");

const command9 = new SlashCommandBuilder();
command9.setName("view-conversation");
command9.setDescription("See what conversations you have.");

const command10 = new SlashCommandBuilder();
command10.setName("new-conversation");
command10.setDescription("Start a new conversation with your chosen AI.");

const command11 = new SlashCommandBuilder();
command11.setName("set-ai");
command11.setDescription("Switch between the options for using this bot.");

const command12 = new SlashCommandBuilder();
command12.setName("create-image");
command12.setDescription(
  "Create a 1024x1024 image using Stable Diffusion! (Powered by Salad.com)",
);
command12.addStringOption((option) =>
  option.setName("prompt").setDescription(
    "Prompt to be sent to Stable Diffusion",
  ).setRequired(true)
);

const command13 = new SlashCommandBuilder();
command13.setName("get-image");
command13.setDescription("Get an image that was made by Stable Diffusion.");

const command14 = new SlashCommandBuilder();
command14.setName("set-sydney-mode");
command14.setDescription("Switch between the 4 modes for Sydney.");

const command15 = new SlashCommandBuilder();
command15.setName("add-document");
command15.setDescription(
  "Add a document to this bot's information database (Powered by Supabase).",
);
command15.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command15.addStringOption((option) =>
  option.setName("file-name").setDescription(
    "The name of the file for the vector database.",
  ).setRequired(true)
);
command15.addAttachmentOption((option) =>
  option.setName("file").setDescription("The file to be added to the database.")
    .setRequired(true)
);

const command16 = new SlashCommandBuilder();
command16.setName("create-image-bingchat");
command16.setDescription(
  "Create an image using DALL-E 3! (Powered by Bing Chat Image Maker)",
);
command16.addStringOption((option) =>
  option.setName("prompt").setDescription("Prompt to be sent to DALL-E 3")
    .setRequired(true)
);

const command17 = new SlashCommandBuilder();
command17.setName("oops");
command17.setDescription(
  "Bot crashed while sending a message? Use this to fix it.",
);

const botamt = 17;
for (let i = 1; i - 1 < botamt; i++) {
  const commandname = "command" + i;
  commands.push(eval(commandname));
}

const appid: string = Deno.env.get("APP_ID")!;
const token: string = Deno.env.get("DISCORD_TOKEN")!;

const rest = new REST({ version: "10" }).setToken(token);

// Send slash commands to Discord, create event handler.
client.on("ready", async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(appid), {
      body: commands,
    });

    console.log("Successfully reloaded application (/) commands.");

    console.log("Loaded slash commands successfully!");
  } catch (error) {
    console.error(error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "set-ai") {
      const llm = interaction.values[0];

      console.log(llm);

      await db.set(["users", interaction.user.id, "current_bot"], llm);

      await interaction.reply({
        content: `Set your LLM to \`${llm}\`!`,
        ephemeral: true,
      });
    }
  }
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === "info") {
    const colorstr: string = "#" +
      Math.floor(Math.random() * 16777215).toString(16);

    const color = colorstr as ColorResolvable;

    const embed = new EmbedBuilder()
      .setTitle("About this bot!")
      .setDescription("Apologies, but /info wasn't written yet.")
      .setTimestamp()
      .setColor(color);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (interaction.commandName === "wipe") {
    const llm =
      (await db.get<string>(["users", interaction.user.id, "current_bot"]))
        .value; // After reading the typedocs I realized this is the cleaner way to do this
    const curconv = (await db.get<number>([
      "users",
      interaction.user.id,
      "current_conversation",
    ])).value;

    if (llm === null || curconv === null) {
      await interaction.reply({
        content: "Send a message before wiping your conversation!",
        ephemeral: true,
      });
      return;
    }

    const messages = (await db.get<messagedata[]>([
      "users",
      interaction.user.id,
      "conversations",
      llm,
    ])).value;

    if (messages === null) {
      await interaction.reply({
        content: "Send a message before wiping your conversation!",
        ephemeral: true,
      });
      return;
    }

    messages[curconv] = {
      id: "New Conversation",
      messages: [],
    };

    await db.set(
      ["users", interaction.user.id, "conversations", llm],
      messages,
    );

    await interaction.reply({
      content: `Your conversation with "${llm}" was reset!`,
      ephemeral: true,
    });
  } else if (interaction.commandName === "add-channel") {
    await interaction.reply({
      content: "Command not implemented",
      ephemeral: true,
    });
  } else if (interaction.commandName === "remove-channel") {
    await interaction.reply({
      content: "Command not implemented",
      ephemeral: true,
    });
  } else if (interaction.commandName === "set-ai") {
    const options = [];

    const chatgpt = {
      label: "ChatGPT",
      value: "chatgpt",
      description: "Default AI. Uses gpt-3.5-turbo. Highly reliable.",
    };

    const bing_chat = {
      label: "Bing Chat",
      value: "bing_chat",
      description: "Slower. Can access the internet. Has daily use cap.",
    };

    const gpt4 = {
      label: "GPT-4",
      value: "gpt4",
      description: "Better version of ChatGPT. Has VDB access.",
    };

    const gpt4_v = {
      label: "GPT-4 Vision",
      value: "gpt4_v",
      description: "GPT-4 but it can take vision inputs.",
    };

    const gemini = {
      label: `Gemini Pro`,
      value: "gemini",
      description: `Google's AI model, specifically their 2nd best.`,
    };

    const mixtral = {
      label: `Mixtral 8x7b (32768)`,
      value: "mixtral",
      description: `Mistral's MoE model. Powered by Groq.`,
    };

    const claud3 = {
      label: `Claude 3 (Opus)`,
      value: "claude3",
      description: `Current best model on the bot. Has image input.`,
    };

    if (chatgptIsEnabled) options.push(chatgpt);
    if (bingIsEnabled) options.push(bing_chat);
    if (gpt4IsEnabled) options.push(gpt4);
    if (gpt4vIsEnabled) options.push(gpt4_v);
    if (geminiIsEnabled) options.push(gemini);
    options.push(mixtral);
    options.push(claud3);

    const select = new StringSelectMenuBuilder().setCustomId("set-ai")
      .setPlaceholder("Select an AI").addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      select,
    );

    interaction.reply({
      content: "Select an AI to use!",
      components: [row],
      ephemeral: true,
    });
  } else if (interaction.commandName === "add-document") {
    const attachment = interaction.options.getAttachment("file")
      ? interaction.options.getAttachment("file")!
      : { contentType: "null", url: "" };

    let attachmentName = interaction.options.getString("file-name");

    if (attachmentName === null) {
      attachmentName = "";
    }

    console.log(attachment);

    if (attachment.contentType === "text/plain; charset=utf-8") {
      await interaction.deferReply({ ephemeral: true });

      const fstatement = await fetch(attachment.url);

      const content = await fstatement.text();

      console.log(content);

      try {
        // await addDocument(content, attachmentName);

        // interaction.editReply({ content: "The document has been uploaded and is now in the bot's information database" });

        interaction.editReply({ content: "Vector database disabled!" });
      } catch (_err) {
        interaction.editReply({
          content:
            "Something went wrong adding the document! The database may be disabled, please check the logs.",
        });
      }
    } else {
      console.log(
        "Invalid document given, document was of type",
        attachment.contentType,
      );
      interaction.reply({
        content:
          `The given document is not a text file! Please send a .txt file to be uploaded. All we know is that you gave us this type of file: "${attachment.contentType}`,
        ephemeral: true,
      });
    }
  } else if (interaction.commandName === "create-image-bingchat") {
    await interaction.deferReply({ ephemeral: true });

    const prompt = interaction.options.getString("prompt");

    const id = crypto.randomUUID();

    try {
      const imageCreator = new BingImageCreator({
        userToken: Deno.env.get("BING_COOKIE"),
      });

      const imageData = await imageCreator.genImageList(prompt, id, true);

      let resp = `Here's your image${
        imageData.length === 1 ? "!" : "s!"
      } The prompt you gave me was "${prompt}":\n`;

      imageData.forEach((url: string) => {
        resp = resp.concat(`${url}\n`);
      });

      interaction.editReply(resp);
    } catch (err) {
      interaction.editReply(
        `Something went wrong making the images! All I know is the error was "${err}".`,
      );
    }
  } else if (interaction.commandName === "oops") {
    const llm =
      (await db.get<string>(["users", interaction.user.id, "current_bot"]))
        .value; // After reading the typedocs I realized this is the cleaner way to do this
    const curconv = (await db.get<number>([
      "users",
      interaction.user.id,
      "current_conversation",
    ])).value;

    if (llm === null || curconv === null) {
      await interaction.reply({
        content: "Send a message before wiping your conversation!",
        ephemeral: true,
      });
      return;
    }

    if (
      (await db.get<boolean>([
        "users",
        interaction.user.id,
        "messageWaiting",
      ])).value == false
    ) {
      await interaction.reply({
        content:
          "You haven't sent a message yet or there's no message pending. I don't know what you want me to do here.",
        ephemeral: true,
      });
      return
    }

    await db.set(
      ["users", interaction.user.id, "messageWaiting"],
      false,
    );

    await interaction.reply({
      content:
        `You should be able to send messages now. "${llm}" no longer thinks you're in a conversation.`,
      ephemeral: true,
    });
  }
});
