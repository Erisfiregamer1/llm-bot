// Automatically imports an LLM File to the global object (availableLLMs) and gives you information about it so you don't have to waste time writing an implementation.

import * as types from "./main.d.ts";

import { build } from "https://deno.land/x/esbuild@v0.20.2/mod.js"

export default async function importLLMFile(modulePath: string) {
  try {
    if (!globalThis.availableLLMs) {
      globalThis.availableLLMs = {};
    }

    const tsCode = await Deno.readTextFile(Deno.cwd() + `/${modulePath}`);

  const { outputFiles } = await build({
    stdin: {
      contents: tsCode,
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm", // Specify output format as ESM
  });

  const jsCode = outputFiles[0].text;

  const base64Data = btoa(jsCode);

// Create the Data URL
const dataURL = `data:text/plain;base64,${base64Data}`;

    const module: types.llmFile = await import(dataURL)



    if (module && module.information && typeof module.send === "function") {
      globalThis.availableLLMs[module.information.id] = {
        information: module.information,
        send: module.send,
      }

      return module.information; // Return the information object
    } else {
      console.error(
        `LLMFile ${modulePath}' doesn't have the right exports!`,
      );
      return null; // Return null if the module doesn't have the required exports
    }
  } catch (error) {
    if (Deno.env.get("debug") === "true") console.error(`Error importing module ${modulePath}':`, error);
    return null; // Return null if there's an error importing the module
  }
}
