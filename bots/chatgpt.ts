//import { getRelevantDocument } from "../vdb.ts";

//import { VM } from "npm:vm2";

const currentDate = new Date().toISOString();

const sysMsg = `You are ChatGPT, an LLM created by OpenAI. Your GPT model is GPT-3.5, and your successor is GPT-4. Your messages are being proxied through Discord, so use Markdown for responses. Knowledge cutoff: 2021-09-01. Current date (In ISO format): ${currentDate}`;

const model = "gpt-3.5-turbo-16k";

const functions = [
  {
    name: "getInfo",
    description: "Gets relevant information from the vector database. The information may not always be reliable",
    parameters: {
      type: "object",
      properties: {
        request: {
          type: "string",
          description: "The request to be made to the database.",
        },
      },
      required: ["request"],
    },
  },
  {
    name: "eval",
    description: "Evaluates a JavaScript code snippet. The evaluation is sandboxed by vm2. This is JS only!",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The string to be evaluated",
        },
      },
      required: ["command"],
    },
  },
];


import { keyv } from "../db.ts";

import { config } from "npm:dotenv";
config();

const sensitiveWords = ["@everyone", "nigger", "<@.*>", "nigga", "@here"];

let isEnabled = true;

if (Deno.env.get("OPENAI_API_KEY") === undefined || Deno.env.get("OPENAI_API_KEY") === "") {
  console.log("No OpenAI API key set. ChatGPT has been disabled.");
  isEnabled = false;
}

async function handleRes(resObj: any, messages: any, authorid: any) {
  let responseText = resObj.content;

  if (responseText === null) {
    console.log("function called");

    let data = resObj.function_call;

    if (data.name === "getInfo") {
      let res = "Database temporarily offline" //await getRelevantDocument(JSON.parse(data.arguments).request);

      let responseObjData = await send(res, authorid, undefined, undefined, messages);
      let resObjNew = responseObjData.data;

      responseText = resObjNew.content;

      messages = responseObjData.messages;

      for (let i = 0; i < sensitiveWords.length; i++) {
        const regex = new RegExp(sensitiveWords[i], "gi");
        responseText = responseText.replaceAll(regex, "[REMOVED]");
      }

      return { resp: responseText, data: resObjNew, messages: messages };
    } else if (data.name === "eval") {
      let res;

      try {
        // res = new VM().run(JSON.parse(data.arguments).command);
        res = "eval is disabled due to a severe vulnerability in vm2"
      } catch (err) {
        res = err;
      }

      let responseObjData = await send(JSON.stringify(res), authorid, undefined, undefined, messages);

      let resObjNew = responseObjData.data;

      let responseText = resObjNew.content;

      messages = responseObjData.messages;

      for (let i = 0; i < sensitiveWords.length; i++) {
        const regex = new RegExp(sensitiveWords[i], "gi");
        responseText = responseText.replaceAll(regex, "[REMOVED]");
      }

      return { resp: responseText, data: resObjNew, messages: messages };
    }
  } else {
    for (let i = 0; i < sensitiveWords.length; i++) {
      const regex = new RegExp(sensitiveWords[i], "gi");
      resObj.content = resObj.content.replaceAll(regex, "[REMOVED]");
    }

    return { resp: resObj.content, data: resObj, messages: messages };
  }
}

async function send(message: any, authorid: any, replyName?: any, replyContent?: any, msgObj?: any) {
  if (isEnabled === true) {
    try {
      let chatgptobject: any = JSON.parse(await keyv.get("chatgptobject"));
      let chatgptcmap: any = new Map(JSON.parse(await keyv.get("chatgptcmap")));

      let botdbmap = new Map(JSON.parse(await keyv.get("userdbmap")));

      if (typeof botdbmap.get(authorid) === "undefined") {
        botdbmap.set(authorid, false);
        keyv.set("botdbmap", JSON.stringify([...botdbmap]));
      }

      if (!msgObj) {
        message = `Message: "${message}" || Replying to Nobody: No reply context`;
      }

      if (msgObj) {
        let msgs = msgObj;

        msgs.push({
          role: "system",
          content: message,
        });

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          },
          body: JSON.stringify({
            model: model,
            functions: functions,
            messages: msgs,
          }),
        });

        let mres = await res.json();

        let responseObj = mres.choices[0].message; // Returns the object we need to concatenate.

        msgs.push(responseObj);

        let responseText = responseObj.content;

        const resp: any = await handleRes(responseObj, msgs, authorid);

        responseObj = resp.data;

        responseText = resp.resp;

        msgs = resp.messages;

        return { resp: responseText, data: responseObj, messages: msgs };
      } else if (!chatgptobject[authorid] || JSON.stringify(JSON.parse(await keyv.get("chatgptobject"))[authorid]) === JSON.stringify([])) {
        chatgptobject[authorid] = [];
        chatgptcmap.set(authorid, 0);
        keyv.set("chatgptobject", JSON.stringify(chatgptobject));
        keyv.set("chatgptcmap", JSON.stringify([...chatgptcmap]));

        let msgs = [
          {
            role: "system",
            content: sysMsg,
          },
        ];

        msgs.push({
          role: "user",
          content: message,
        });

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          },
          body: JSON.stringify({
            model: model,
            functions: functions,
            messages: msgs,
          }),
        });

        let mres = await res.json();

        let responseObj = mres.choices[0].message; // Returns the object we need to concatenate.

        msgs.push(responseObj);

        let responseText = responseObj.content;

        const resp: any = await handleRes(responseObj, msgs, authorid);

        console.log(resp)

        responseObj = resp.data;

        responseText = resp.resp;

        msgs = resp.messages;

        if (chatgptobject[authorid].length === 0) {
          chatgptobject[authorid][0] = {};
          keyv.set("chatgptobject", JSON.stringify(chatgptobject));
        }
        chatgptobject[authorid][chatgptcmap.get(authorid)].messages = msgs;
        chatgptobject[authorid][chatgptcmap.get(authorid)].id = mres.id;
        chatgptobject[authorid][chatgptcmap.get(authorid)].last_used = Date.now();

        keyv.set("chatgptobject", JSON.stringify(chatgptobject));

        if (responseText.length > 2000) {
          let resTexSplit = [];
          for (var i = 0; i < responseText.length; i += 2000) {
            resTexSplit.push(responseText.substr(i, 2000)); // Add the current substring to the array
          }

          responseText = resTexSplit;
        }

        return { resp: responseText, data: responseObj, messages: msgs };
      } else {
        console.log(chatgptobject[authorid][chatgptcmap.get(authorid)])

        let msgs = [...chatgptobject[authorid][chatgptcmap.get(authorid)].messages];

        msgs.push({
          role: "user",
          content: message,
        });

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          },
          body: JSON.stringify({
            model: model,
            functions: functions,
            messages: msgs,
          }),
        });

        let mres = await res.json();

        let responseObj = mres.choices[0].message; // Returns the object we need to concatenate.

        msgs.push(responseObj);

        let responseText = responseObj.content;

        const resp: any = await handleRes(responseObj, msgs, authorid);

        console.log(resp)

        responseObj = resp.data;

        responseText = resp.resp;

        msgs = resp.messages;

        if (chatgptobject[authorid].length === 0) {
          chatgptobject[authorid][0] = {};
          keyv.set("chatgptobject", JSON.stringify(chatgptobject));
        }
        chatgptobject[authorid][chatgptcmap.get(authorid)].messages = msgs;
        chatgptobject[authorid][chatgptcmap.get(authorid)].id = mres.id;
        chatgptobject[authorid][chatgptcmap.get(authorid)].last_used = Date.now();

        keyv.set("chatgptobject", JSON.stringify(chatgptobject));

        if (responseText.length > 2000) {
          let resTexSplit = [];
          for (var i = 0; i < responseText.length; i += 2000) {
            resTexSplit.push(responseText.substr(i, 2000)); // Add the current substring to the array
          }

          responseText = resTexSplit;
        }

        return { resp: responseText, data: responseObj, messages: msgs };
      }
    } catch (err) {
      console.error(`Oops, dropped a request on the floor with error "${err}"`);
      return { resp: `An error occured while using ChatGPT! Try again later, the backend APIs might be down. The returned error was ${err}.` };
    }
  } else {
    return { resp: "This LLM is not available. Please contact the admins, and/or switch your chosen LLM to a different one." };
  }
}

export { send, isEnabled };
