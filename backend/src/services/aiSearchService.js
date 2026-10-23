import fs from "fs";
import path from "path";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Load system prompt from external file
const SMART_SEARCH_PROMPT = fs.readFileSync(path.resolve(__dirname, "./ai/smartSearchPrompt.txt"), "utf8");

export async function analyzeSearchQuery(query) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: SMART_SEARCH_PROMPT
      },
      {
        role: "user",
        content: query
      }
    ]
  });

  const raw = response.choices[0].message.content.trim();
  return JSON.parse(raw);
}
