// Here we go again.
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
} from "npm:discord.js";

import { config } from "npm:dotenv";

config();

const token = Deno.env.get("DISCORD_TOKEN");
const id = Deno.env.get("APP_ID");

if (typeof token !== "string") {
  throw "No Discord bot token set! Set DISCORD_TOKEN in .env to your bot's token!";
} else if (typeof id !== "string") {
  throw `No Discord app ID set! Set APP_ID in .env to your bot's client ID!`;
}

const client: Client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    // Partials.User,
    Partials.Channel,
    // Partials.GuildMember,
    // Partials.Message,
    // Partials.Reaction,
    // Partials.GuildScheduledEvent,
    // Partials.ThreadMember,
  ],
});

client.on("ready", (c) => {
  console.log(`Logged in as ${c.user.tag}!`);

  c.user.setActivity("people use ChatGPT differently", {
    type: ActivityType.Watching,
  });
});

await client.login(Deno.env.get("DISCORD_TOKEN"));

export default client;
