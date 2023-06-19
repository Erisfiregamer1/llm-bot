import { keyv } from "../db.ts";

let isEnabled = true;

let client: any;

type Message = {
  author: string;
  content: string;
};

type palmres = {
  candidates: Message[];
  messages: Message[];
};

let key: any = Deno.env.get("PALM_API_KEY")

if (key === undefined || key === "") {
  console.log("No PaLM API key set. PaLM has been disabled.");
  isEnabled = false;
}

const context = "You are PaLM 2, a Large Language Model made by Google.";

async function send(message: string, authorid: string, replyName?: unknown, replyContent?: unknown) {
  if (isEnabled === true) {
    try {
      const palmobject: any = JSON.parse(await keyv.get("palmobject"));
      const palmcmap: any = new Map(JSON.parse(await keyv.get("palmcmap")));

      if (!palmobject[authorid] || JSON.stringify(JSON.parse(await keyv.get("palmobject"))[authorid]) === JSON.stringify([])) {
        palmobject[authorid] = [];
        palmcmap.set(authorid, 0);

        keyv.set("palmobject", JSON.stringify(palmobject));
        keyv.set("palmcmap", JSON.stringify([...palmcmap]));

        let messages: Array<unknown> = [];

        messages.push({ author: "0", content: message });

        const unform_res: Response = await fetch(`https://generativelanguage.googleapis.com/v1beta2/${Deno.env.get("PALM_MODEL")}:generateMessage?key='${Deno.env.get("PALM_API_KEY")}`, {
          body: JSON.stringify({
            temperature: 0.25,
            candidateCount: 1,
            prompt: {
              context: context,
              messages: messages,
            }
          }),
        })

        const res: palmres = await unform_res.json()

        if (JSON.stringify(res.candidates) === JSON.stringify([])) {
          throw "ncf";
        }

        messages = res.messages; // Overwrite with returned messages for consistency

        messages.push(res.candidates[0]); // ... and inject the new message

        if (palmobject[authorid].length === 0) {
          palmobject[authorid][0] = {};
          keyv.set("palmobject", JSON.stringify(palmobject));
        }
        palmobject[authorid][palmcmap.get(authorid)].messages = messages;
        palmobject[authorid][palmcmap.get(authorid)].id = palmcmap.get(authorid);
        palmobject[authorid][palmcmap.get(authorid)].last_used = Date.now();

        keyv.set("palmobject", JSON.stringify(palmobject));

        return res.candidates[0].content;
      } else {
        let messages = palmobject[authorid][palmcmap.get(authorid)].messages;

        messages.push({ author: "0", content: message });

        const unform_res: Response = await fetch(`https://generativelanguage.googleapis.com/v1beta2/${Deno.env.get("PALM_MODEL")}:generateMessage?key='${Deno.env.get("PALM_API_KEY")}`, {
          body: JSON.stringify({
            temperature: 0.25,
            candidateCount: 1,
            prompt: {
              context: context,
              messages: messages,
            }
          }),
        })

        const res: palmres = await unform_res.json()

        if (JSON.stringify(res.candidates) === JSON.stringify([])) {
          throw "ncf";
        }

        messages = res.messages; // Overwrite with returned messages for consistency

        messages.push(res.candidates[0]); // ... and inject the new message

        if (palmobject[authorid].length === 0) {
          palmobject[authorid][0] = {};
          keyv.set("palmobject", JSON.stringify(palmobject));
        }
        palmobject[authorid][palmcmap.get(authorid)].messages = messages;
        palmobject[authorid][palmcmap.get(authorid)].id = palmcmap.get(authorid);
        palmobject[authorid][palmcmap.get(authorid)].last_used = Date.now();

        keyv.set("palmobject", JSON.stringify(palmobject));

        return res.candidates[0].content;
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
