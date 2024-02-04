# llm-bot

A Discord bot for interacting with LLMs.

## Installation tutorial

1. Create a .env file.
2. Populate the file with these values:

```
DISCORD_TOKEN=""
OPENAI_API_KEY=""
BING_COOKIE=""
GEMINI_API_KEY=""
DISCORD_APP_ID=""
SUPABASE_URL=""
SUPABASE_SERVICE_ROLE_KEY=""
```

3. Run the bot using Deno:
   `deno run --allow-net --allow-read --allow-env main.ts`<br> 3.1: Or, run the
   direct file how you normally would. Check Github Actions for the files you'll
   need.
