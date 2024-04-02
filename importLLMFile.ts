// Automatically imports an LLM File to the global object (availableLLMs) and gives you information about it so you don't have to waste time writing an implementation.

import * as types from "./main.d.ts";

import { dynamicImport } from 'https://deno.land/x/import/mod.ts';

export default async function importLLMFile(modulePath: string) {
  try {
    if (!globalThis.availableLLMs) {
      globalThis.availableLLMs = {};
    }

    const module: types.llmFile = await dynamicImport(`${modulePath}`, { force: true });

    if (module && module.information && typeof module.send === "function") {
      globalThis.availableLLMs[module.information.id] = {
        information: module.information,
        send: module.send,
      };
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
