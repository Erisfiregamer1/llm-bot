import { SupabaseVectorStore } from "npm:langchain/vectorstores/supabase";
import { OpenAIEmbeddings } from "npm:langchain/embeddings/openai";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.26.0";
import { Document } from "npm:langchain/document";

import { config } from "npm:dotenv";
config();

let dbEnabled = true;

const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const url = Deno.env.get("SUPABASE_URL");
const apiKey = Deno.env.get("OPENAI_API_KEY");

let client: SupabaseClient;
let vectorStore: SupabaseVectorStore;

if (typeof supabaseKey !== "string") {
  console.log(
    `SUPABASE_SERVICE_ROLE_KEY is not defined in your .env, the database will be disabled.`,
  );
  dbEnabled = false;
} else if (typeof url !== "string") {
  console.log(
    `SUPABASE_URL is not defined in your .env, the database will be disabled.`,
  );
  dbEnabled = false;
} else {
  try {
    client = createClient(url, supabaseKey, {
      auth: { persistSession: false },
    });

    vectorStore = await SupabaseVectorStore.fromExistingIndex(
      new OpenAIEmbeddings({
        openAIApiKey: apiKey,
      }),
      {
        client,
        tableName: "documents",
        queryName: "match_documents",
      },
    );
  } catch (_err) {
    console.warn(
      "Something went wrong starting the database, are you sure the API key and Supabase URL are right? The database has been disabled.",
    );
    dbEnabled = false;
  }
}

export const addDocument = async (
  documentContent: string,
  documentName: string,
) => {
  if (!dbEnabled) {
    throw "Database disabled";
  }

  const docsarr = [];

  const document = new Document({
    pageContent: documentContent,
    metadata: { name: documentName },
  });

  docsarr.push(document);

  const res = await vectorStore.addDocuments(docsarr);

  console.log(res);

  return res;
};

export const getRelevantDocument = async (query: string) => {
  try {
    if (!dbEnabled) {
      return "Database disabled";
    }

    let result: Document[] | string = await vectorStore.similaritySearch(
      query,
      1,
    );

    if (JSON.stringify(result) === JSON.stringify([])) {
      result = "No result found";
    } else {
      result = result[0].pageContent;
    }

    console.log(result);

    return result;
  } catch (_err) {
    return "Something went wrong trying to get information from the database!";
  }
};
