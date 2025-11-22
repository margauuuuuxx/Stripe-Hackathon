// Load environment variables
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from backend directory first, then current directory
dotenv.config({ path: resolve(__dirname, "../backend/.env") });
dotenv.config(); // Also try current directory

const EMBED_URL =
  "https://api.dat1.co/api/v1/collection/qwen3-embedding/invoke";
const API_KEY = process.env.DAT1_API_KEY;

// Example product catalog: generic T-shirts
const products = [
  {
    id: 1,
    name: "Minimal Black T-Shirt",
    description: "Plain black cotton T-shirt with a slim fit and no logos.",
  },
  {
    id: 2,
    name: "Graphic Retro T-Shirt",
    description:
      "Vintage-inspired graphic print with bright colors and relaxed fit.",
  },
  {
    id: 3,
    name: "Sport Performance Tee",
    description:
      "Moisture-wicking, breathable T-shirt designed for running and workouts.",
  },
  {
    id: 4,
    name: "Eco-Friendly Organic Tee",
    description:
      "Soft T-shirt made from organic cotton and sustainable materials.",
  },
];

async function getEmbeddings(texts) {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    console.error("Embedding error:", res.status, await res.text());
    throw new Error("Failed to get embeddings");
  }

  const data = await res.json();
  return data.embeddings;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

async function buildProductIndex() {
  const texts = products.map(
    (p) => `${p.name} - ${p.description}`
  );
  const embeddings = await getEmbeddings(texts);

  return products.map((p, i) => ({
    ...p,
    embedding: embeddings[i],
  }));
}

async function recommendProducts(userText, k = 3) {
  const index = await buildProductIndex();
  const [userEmbedding] = await getEmbeddings([userText]);

  const scored = index.map((p) => ({
    product: p,
    score: cosineSimilarity(userEmbedding, p.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

async function main() {
  const userText = `
I’m looking for a comfortable T-shirt for running and going to the gym.
Something lightweight and breathable, not a heavy cotton shirt.
`;

  const recs = await recommendProducts(userText, 3);

  console.log("User preferences:", userText.trim(), "\n");
  console.log("Recommended products:");
  for (const { product, score } of recs) {
    console.log(`- ${product.name} (score=${score.toFixed(3)})`);
    console.log(`  ${product.description}\n`);
  }
}

main().catch(console.error);
