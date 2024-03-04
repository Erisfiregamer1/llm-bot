// This is only to be used if you feel like something got fucked up while coding the bot.

// This takes 2 arguments: the bot file to test (--filename) and what test you want to do: "just_work" or "is_functional" (--type)

// "just_work", as the name suggests, just makes sure the LLM file returns a valid output. If it fails, it'll throw an error.

// "is_functional" asks the bot to say nothing but true and checks if it matches. If it doesn't, error will be thrown.

// If both sanity checks pass, it's probably safe to use that code.

let llmfile_path = "../bots/REPLACEME.ts";
let type = "";

const filenameIndex = Deno.args.indexOf("--filename");
const typeIndex = Deno.args.indexOf("--type");

if (filenameIndex !== -1 && filenameIndex + 1 < Deno.args.length) {
  const filename = Deno.args[filenameIndex + 1];

  llmfile_path = llmfile_path.replace("REPLACEME", filename);
} else {
  console.error(
    'No filename argument provided or value is missing (--filename "chatgpt")',
  );
  Deno.exit(1);
}

if (typeIndex !== -1 && typeIndex + 1 < Deno.args.length) {
  // Get the value of the type argument
  type = Deno.args[typeIndex + 1];

  // Check if the type is one of the specified values
  if (type !== "is_functional" && type !== "just_work") {
    console.error(
      "Invalid type argument. It should be either 'is_functional' or 'just_work'",
    );
    Deno.exit(1); // Exit with error code 1
  }
} else {
  console.log(
    'No type argument provided or value is missing (--type "is_functional")',
  );
  Deno.exit(1); // Exit with error code 1
}

import(llmfile_path).then((module) => {
  // Module is imported successfully
  console.log("Module imported:", module);

  if (module.send) {
    if (type === "just_work") {
      console.log("Checking if the LLM file is functional...");

      try {
        const res = module.send([{
          role: "system",
          content:
            "You are running in a sanity check mode. Output anything, but making it very short is advisable.",
        }]);
      } catch (err) {
        throw `BotFailed: Error was thrown while sending message (${err})`;
      }
    }
  } else {
    console.error("This isn't an LLM file (no send function on module)! >:/");
  }
}).catch((error) => {
  // Error occurred while importing module
  console.error("Error importing module:", error);
});
