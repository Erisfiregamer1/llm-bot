import client from "./client.ts";

import { BingImageCreator } from "https://esm.sh/@timefox/bic-sydney@1.1.4";
import crypto from "node:crypto";

import { isEnabled as palmIsEnabled } from "./bots/palm.ts";
import { isEnabled as chatgptIsEnabled } from "./bots/chatgpt.ts";
import { isEnabled as bingIsEnabled } from "./bots/bing_chat.ts";
import { isEnabled as gpt4IsEnabled } from "./bots/gpt_4.ts";

// import { addDocument } from "./vdb.ts";

console.log("Loading slash commands...");

import { config } from "npm:dotenv";
config();

import { keyv } from "./db.ts"; // We're going to need to use the main DB for this. Fun.

import { REST } from "npm:@discordjs/rest";

import { Routes } from "npm:discord-api-types/v9";

import { ActionRowBuilder, StringSelectMenuBuilder, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ColorResolvable } from "npm:discord.js";
import { APIActionRowComponent, Embed, MessageActionRowComponentBuilder } from "npm:discord.js@dev";

const commands: any = [];

const command1 = new SlashCommandBuilder();
command1.setName("info");
command1.setDescription("Gives some information about this bot! :)");

const command2 = new SlashCommandBuilder();
command2.setName("wipe");
command2.setDescription("Resets your conversation with your current AI, letting you start over.");

const command3 = new SlashCommandBuilder();
command3.setName("add-channel");
command3.setDescription("For server management! Make the bot use a channel.");
command3.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command3.addChannelOption((option) => option.setName("channel").setDescription("Channel to add to bot").setRequired(true));

const command4 = new SlashCommandBuilder();
command4.setName("remove-channel");
command4.setDescription("For server management! Removes the bot from a channel.");
command4.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command4.addChannelOption((option) => option.setName("channel").setDescription("Channel to remove from bot").setRequired(true));

const command5 = new SlashCommandBuilder();
command5.setName("ban");
command5.setDescription("Bans a user from being able to use the bot! THIS IS FOR THE BOT DEVELOPER!!!");
command5.addStringOption((option) => option.setName("id").setDescription("UserID to send to brazil").setRequired(true));

const command6 = new SlashCommandBuilder();
command6.setName("unban");
command6.setDescription("Unbans a user from the bot! THIS IS FOR THE BOT DEVELOPER!!!");
command6.addStringOption((option) => option.setName("id").setDescription("UserID to remove from brazil").setRequired(true));

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
command12.setDescription("Create a 1024x1024 image using Stable Diffusion! (Powered by Salad.com)");
command12.addStringOption((option) => option.setName("prompt").setDescription("Prompt to be sent to Stable Diffusion").setRequired(true));

const command13 = new SlashCommandBuilder();
command13.setName("get-image");
command13.setDescription("Get an image that was made by Stable Diffusion.");

const command14 = new SlashCommandBuilder();
command14.setName("set-sydney-mode");
command14.setDescription("Switch between the 4 modes for Sydney.");

const command15 = new SlashCommandBuilder();
command15.setName("add-document");
command15.setDescription("Add a document to this bot's information database (Powered by Supabase).");
command15.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);
command15.addStringOption((option) => option.setName("file-name").setDescription("The name of the file for the vector database.").setRequired(true));
command15.addAttachmentOption((option) => option.setName("file").setDescription("The file to be added to the database.").setRequired(true));

const command16 = new SlashCommandBuilder();
command16.setName("create-image-bingchat");
command16.setDescription("Create an image using DALL-E 2! (Powered by Bing Chat Image Maker)");
command16.addStringOption((option) => option.setName("prompt").setDescription("Prompt to be sent to DALL-E 2").setRequired(true));

const botamt = 16;
for (let i = 1; i - 1 < botamt; i++) {
  const commandname = "command" + i;
  commands.push(eval(commandname));
}

const appid: string = Deno.env.get("APP_ID")!
const token: string = Deno.env.get("DISCORD_TOKEN")!

const rest = new REST({ version: "10" }).setToken(token);

// Send slash commands to Discord, create event handler.
client.once("ready", async () => {
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
      const userbotmap: Map<string, string> = new Map(JSON.parse(await keyv.get("userbotmap")));
      userbotmap.set(interaction.user.id, interaction.values[0]);
      await keyv.set("userbotmap", JSON.stringify(Array.from(userbotmap.entries())));
      interaction.reply({ content: "Set your AI to " + interaction.values[0] + "!", ephemeral: true });
    }
  }
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName === "info") {

    const colorstr: string = "#" + Math.floor(Math.random() * 16777215).toString(16)

    const color = colorstr as ColorResolvable

    const embed = new EmbedBuilder()
      .setTitle("About this bot!")
      .setDescription("Apologies, but /info wasn't written yet.")
      .setTimestamp()
      .setColor(color);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } else if (interaction.commandName === "wipe") {
    if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(interaction.user.id) === undefined) {
      interaction.reply({ content: "You have never used this bot before! Say something in a bot channel.", ephemeral: true });
      return;
    }
    if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(interaction.user.id) === "chatgpt") {
      const chatgptobject = JSON.parse(await keyv.get("chatgptobject"));
      const chatgptcmap = new Map(JSON.parse(await keyv.get("chatgptcmap")));

      if (chatgptobject[interaction.user.id].length === 0) {
        interaction.reply({ content: "You have no conversations with ChatGPT! Say something in a bot channel to start one.", ephemeral: true });
        return;
      }

      const index_a = chatgptcmap.get(interaction.user.id)

      const index = index_a as number

      chatgptobject[interaction.user.id][index] = {
        id: "0",
        messages: [
          {
            role: "system",
            content: `You are ChatGPT, an LLM created by OpenAI. Your GPT model is GPT-3.5, and your successor is GPT-4. Your messages are being proxied through Discord, so use Markdown for responses. Knowledge cutoff: 2021-09-01. Current date (In ISO format): ${new Date().toISOString()}`,
          },
        ],
        last_used: "null",
      };

      await keyv.set("chatgptobject", JSON.stringify(chatgptobject));

      interaction.reply({ content: "Successfully wiped your conversation with ChatGPT!", ephemeral: true });
    } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(interaction.user.id) === "bing_chat") {
      let bingobject: any = JSON.parse(await keyv.get("bingobject"));
      let bingcmap: any = new Map(JSON.parse(await keyv.get("bingcmap")));

      if (bingobject[interaction.user.id].length === 0) {
        interaction.reply({ content: "You have no conversations with Bing Chat! Say something in a bot channel to start one.", ephemeral: true });
        return;
      }

      bingobject[interaction.user.id][bingcmap.get(interaction.user.id)] = { id: "0", id2: "0", last_used: "null" };

      await keyv.set("bingobject", JSON.stringify(bingobject));

      interaction.reply({ content: "Successfully wiped your conversation with Bing Chat!", ephemeral: true });
    } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(interaction.user.id) === "gpt4") {
      let gpt4object: any = JSON.parse(await keyv.get("gpt4object"));
      let gpt4cmap: any = new Map(JSON.parse(await keyv.get("gpt4cmap")));

      if (gpt4object[interaction.user.id].length === 0) {
        interaction.reply({ content: "You have no conversations with GPT-4! Say something in a bot channel to start one.", ephemeral: true });
        return;
      }

      gpt4object[interaction.user.id][gpt4cmap.get(interaction.user.id)] = {
        id: "0",
        messages: [
          {
            role: "system",
            content: "You are GPT-4, an LLM created by OpenAI.",
          },
        ],
        last_used: "null",
      };

      await keyv.set("gpt4object", JSON.stringify(gpt4object));

      interaction.reply({ content: "Successfully wiped your conversation with GPT-4!", ephemeral: true });
    } else if (new Map(JSON.parse(await keyv.get("userbotmap"))).get(interaction.user.id) === "palm") {
      const palmobject: any = JSON.parse(await keyv.get("palmobject"));
      const palmcmap: any = new Map(JSON.parse(await keyv.get("palmcmap")));

      if (typeof palmobject[interaction.user.id] === "undefined") {
        interaction.reply({ content: "You have no conversations with PaLM! Say something in a bot channel to start one.", ephemeral: true });
        return;
      }

      if (palmobject[interaction.user.id].length === 0) {
        interaction.reply({ content: "You have no conversations with PaLM! Say something in a bot channel to start one.", ephemeral: true });
        return;
      }

      palmobject[interaction.user.id][palmcmap.get(interaction.user.id)] = {
        id: palmcmap.get(interaction.user.id),
        messages: [],
        last_used: "null",
      };

      await keyv.set("palmobject", JSON.stringify(palmobject));

      interaction.reply({ content: "Successfully wiped your conversation with PaLM!", ephemeral: true });
    }
  } else if (interaction.commandName === "add-channel") {
    const channel: any = interaction.options.getChannel("channel");
    if (channel.type !== 0) {
      interaction.reply({ content: "You can only add text channels!", ephemeral: true });
      return;
    }

    if (client.channels.cache.get(channel.id) === undefined) {
      interaction.reply({ content: "This channel is not in the server!", ephemeral: true });
      return;
    }

    const channelset = new Set(JSON.parse(await keyv.get("channels")));

    if (channelset.has(channel.id)) {
      interaction.reply({ content: "This channel is already added!", ephemeral: true });
      return;
    }

    channelset.add(channel.id);

    await keyv.set("channels", JSON.stringify([...channelset]));

    interaction.reply({ content: "Successfully added the channel to the bot!", ephemeral: true });
  } else if (interaction.commandName === "remove-channel") {
    const channel = interaction.options.getChannel("channel")!;
    if (channel.type !== 0) {
      interaction.reply({ content: "You can only remove text channels!", ephemeral: true });
      return;
    }

    if (client.channels.cache.get(channel.id) === undefined) {
      interaction.reply({ content: "This channel is not in the server!", ephemeral: true });
      return;
    }

    const channelset = new Set(JSON.parse(await keyv.get("channels")));

    if (!channelset.has(channel.id)) {
      interaction.reply({ content: "This channel is not in the channel list!", ephemeral: true });
      return;
    }

    channelset.delete(channel.id);

    await keyv.set("channels", JSON.stringify([...channelset]));

    interaction.reply({ content: "Successfully removed the channel from the bot!", ephemeral: true });
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
      description: "Better version of ChatGPT. Powers Bing Chat. Has no internet.",
    };

    const palmodel: any = Deno.env.get("PALM_MODEL")

    const palm = {
      label: `PaLM (${palmodel.replace("models/", "")})`,
      value: "palm",
      description: `Google's AI model. The specific model is ${palmodel.replace("models/", "")}.`,
    };

    if (chatgptIsEnabled) options.push(chatgpt);
    if (bingIsEnabled) options.push(bing_chat);
    if (gpt4IsEnabled) options.push(gpt4);
    if (palmIsEnabled) options.push(palm);

    const select = new StringSelectMenuBuilder().setCustomId("set-ai").setPlaceholder("Select an AI").addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    interaction.reply({ content: "Select an AI to use!", components: [row], ephemeral: true });
  } else if (interaction.commandName === "add-document") {
    const attachment = interaction.options.getAttachment("file") ? interaction.options.getAttachment("file")! : { contentType: "null", url: "" };

    const attachmentName = interaction.options.getString("file-name") ? interaction.options.getString("file-name") : "";

    console.log(attachment);

    if (attachment.contentType === "text/plain; charset=utf-8") {
      await interaction.deferReply({ ephemeral: true });

      const fstatement = await fetch(attachment.url);

      const content = await fstatement.text();

      console.log(content);

      try {
        // await addDocument(content, attachmentName);

        interaction.editReply({ content: "Vector database disabled due to problems with compilation" })

        return

        // interaction.editReply({ content: "The document has been uploaded and is now in the bot's information database!" });
      } catch (_err) {
        interaction.editReply({ content: "Something went wrong adding the document! The database may be disabled, please check the logs." });
      }
    } else {
      console.log("Invalid document given, document was of type", attachment.contentType);
      interaction.reply({ content: `The given document is not a text file! Please send a .txt file to be uploaded. All we know is that you gave us this type of file: "${attachment.contentType}`, ephemeral: true });
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

    let resp = `Here's your image${imageData.length === 1 ? "!" : "s!"} The prompt you gave me was "${prompt}":\n`;

    imageData.forEach((url: any) => {
      resp = resp.concat(`${url}\n`);
    });

    interaction.editReply(resp);

  } catch (err) {
    interaction.editReply(`Something went wrong making the images! All I know is the error was "${err}".`);
  }
  }
});
