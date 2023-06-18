import { DiscussServiceClient } from "npm:@google-ai/generativelanguage";
import { GoogleAuth } from "npm:google-auth-library";

import { keyv } from "../db.ts";

let isEnabled = false;

let client: any;

let key: any = Deno.env.get("PALM_API_KEY")

if (key === undefined || key === "") {
  console.log("No PaLM API key set. PaLM has been disabled.");
  isEnabled = false;
} else {
  try {
    client = new DiscussServiceClient({
      authClient: new GoogleAuth().fromAPIKey(key),
    });
  } catch (err) {
    console.log(`PaLM failed to start! The error was "${err}". PaLM has been disabled.`);
    isEnabled = false;
  }
}

const context = "You are PaLM 2, a Large Language Model made by Google.";

async function send(message: any, authorid: any, replyName?: any, replyContent?: any) {
  if (isEnabled === true) {
    try {
      let palmobject: any = JSON.parse(await keyv.get("palmobject"));
      let palmcmap: any = new Map(JSON.parse(await keyv.get("palmcmap")));

      if (!palmobject[authorid] || JSON.stringify(JSON.parse(await keyv.get("palmobject"))[authorid]) === JSON.stringify([])) {
        palmobject[authorid] = [];
        palmcmap.set(authorid, 0);

        keyv.set("palmobject", JSON.stringify(palmobject));
        keyv.set("palmcmap", JSON.stringify([...palmcmap]));

        let messages = [];

        messages.push({ author: "0", content: message });

        const res = await client.generateMessage({
          model: Deno.env.get("PALM_MODEL"),
          temperature: 0.25,
          candidateCount: 1,
          prompt: {
            context: context,
            // required, alternating prompt/response messages
            messages: messages,
          },
        });

        if (JSON.stringify(res[0].candidates) === JSON.stringify([])) {
          throw "ncf";
        }

        messages = res[0].messages; // Overwrite with returned messages for consistency

        messages.push(res[0].candidates[0]); // ... and inject the new message

        if (palmobject[authorid].length === 0) {
          palmobject[authorid][0] = {};
          keyv.set("palmobject", JSON.stringify(palmobject));
        }
        palmobject[authorid][palmcmap.get(authorid)].messages = messages;
        palmobject[authorid][palmcmap.get(authorid)].id = palmcmap.get(authorid);
        palmobject[authorid][palmcmap.get(authorid)].last_used = Date.now();

        keyv.set("palmobject", JSON.stringify(palmobject));

        return res[0].candidates[0].content;
      } else {
        let messages = palmobject[authorid][palmcmap.get(authorid)].messages;

        messages.push({ author: "0", content: message });

        const res = await client.generateMessage({
          model: Deno.env.get("PALM_MODEL"),
          temperature: 0.25,
          candidateCount: 1,
          prompt: {
            context: context,
            messages: messages,
          },
        });

        if (JSON.stringify(res[0].candidates) === JSON.stringify([])) {
          throw "ncf";
        }

        messages = res[0].messages; // Overwrite with returned messages for consistency

        messages.push(res[0].candidates[0]); // ... and inject the new message

        if (palmobject[authorid].length === 0) {
          palmobject[authorid][0] = {};
          keyv.set("palmobject", JSON.stringify(palmobject));
        }
        palmobject[authorid][palmcmap.get(authorid)].messages = messages;
        palmobject[authorid][palmcmap.get(authorid)].id = palmcmap.get(authorid);
        palmobject[authorid][palmcmap.get(authorid)].last_used = Date.now();

        keyv.set("palmobject", JSON.stringify(palmobject));

        return res[0].candidates[0].content;
      }
    } catch (err) {
      if (err === "ncf") {
        return "PaLM didn't return a response. Your message wasn't saved, try again.";
      } else {
        console.error(`Oops, dropped a request on the floor with error "${err}"`);
        return "An error occured while using PaLM! Try again later, the backend APIs might be down.";
      }
    }
  } else {
    return "This LLM is not available. Please contact the admins, and/or switch your chosen LLM to a different one.";
  }
}

export { send, isEnabled };
