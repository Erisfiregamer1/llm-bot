// Here we go again.
import { Client, Events, ActivityType, GatewayIntentBits, Partials } from "npm:discord.js";

import { config } from "npm:dotenv";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages],
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

client.on(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}!`);

    c.user.setActivity("people use ChatGPT", {
        type: ActivityType.Watching,
    });
});

client.on(Events.Debug, (message) => console.log("Debug:", message)); // Listen for debug messages

await client.login(Deno.env.get("DISCORD_TOKEN"))

export default client