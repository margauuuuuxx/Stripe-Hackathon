import OpenAI from "openai";

const DAT1_API_KEY = process.env.DAT1_API_KEY!;

const client = new OpenAI({
  baseURL: "https://api.dat1.co/api/v1/collection/open-ai",
  apiKey: DAT1_API_KEY, // required by SDK, not used by Dat1
});

async function main() {
  const resp = await client.chat.completions.create({
    model: "gpt-120-oss",
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "text" },
    messages: [
      { role: "system", content: "You are a helpful assistant" },
      {
        role: "user",
        content: [
          { type: "text", text: "What is the capital of France?" },
        ],
      },
    ],
  });

  console.log(resp.choices[0].message.content);
}

main().catch(console.error);