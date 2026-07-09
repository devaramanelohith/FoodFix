import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";
import path from "path";
import { createServer as createViteServer } from "vite";

const __dirname = process.cwd();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

const RULE_BOOK = `
COMPANY FOOD DELIVERY SUPPORT RULE BOOK

1. Cold food
- Apologize.
- Offer replacement or partial refund.
- Image is not needed.

2. Wrong item
- Apologize.
- Offer replacement or full refund.
- Raise complaint ticket.
- Image is not needed.

3. Missing item
- Apologize.
- Offer refund for missing item or replacement.
- Raise complaint ticket.
- Image is not needed.

4. Food quality / foul / spoiled food
If customer says food is foul, spoiled, stale, smells bad, rotten, has fungus, leaking, damaged, unsafe, contaminated, or looks bad:
- Apologize.
- Tell customer not to consume it.
- Image review can help.
- If image visibly supports complaint, offer refund or replacement.
- Raise high-priority complaint ticket.
- Do not say food is definitely safe.

5. Late delivery
- Apologize.
- Raise complaint ticket.
- If food quality is affected, treat as food quality issue.

General rules
- Use only this rule book.
- Keep reply short.
- Do not invent policy.
`;

const TEXT_PROMPT_TEMPLATE = `
You are a food delivery customer support agent.

Follow only this rule book:

{rule_book}

Recent conversation:
{history}

Customer query:
{customer_query}

Your task:
1. Identify the issue type.
2. Decide severity.
3. Decide if image review is needed using the rule book.
4. Write a short customer reply.

Important:
- Do NOT ask for image inside customer_reply.
- Do NOT say "please upload image".
- image_needed must be true only when image review can help and image has not already been reviewed.

Return valid JSON only.
`;

const IMAGE_PROMPT_TEMPLATE = `
You are a food delivery customer support agent.

Follow only this rule book:

{rule_book}

Recent conversation:
{history}

Customer query:
{customer_query}

The customer has uploaded a food image.

Inspect the image only for visible signs.

Rules:
- Mention only visible observations.
- Do not say food is definitely safe.
- If food visibly looks foul, spoiled, stale, rotten, damaged, leaking, contaminated, or suspicious, offer refund or replacement.
- Raise high-priority complaint ticket if image supports the complaint.
- If image is unclear, say manual review is needed.

Return valid JSON only.
`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get("/api/supabase-config", (req, res) => {
    res.json({
      supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""
    });
  });

  app.post("/api/text-query", async (req, res) => {
    const { customer_query, history } = req.body;
    
    const prompt = TEXT_PROMPT_TEMPLATE.replace("{rule_book}", RULE_BOOK)
        .replace("{history}", JSON.stringify(history))
        .replace("{customer_query}", customer_query);

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    issue_type: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    image_needed: { type: Type.BOOLEAN },
                    customer_reply: { type: Type.STRING }
                },
                required: ["issue_type", "severity", "image_needed", "customer_reply"]
            }
        }
    });

    res.json(JSON.parse(response.text!));
  });

  app.post("/api/image-query", async (req, res) => {
    const { customer_query, history, image_base64, mime_type } = req.body;
    
    const prompt = IMAGE_PROMPT_TEMPLATE.replace("{rule_book}", RULE_BOOK)
        .replace("{history}", JSON.stringify(history))
        .replace("{customer_query}", customer_query);

    const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [
            { text: prompt },
            { inlineData: { data: image_base64, mimeType: mime_type } }
        ],
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visible_observation: { type: Type.STRING },
                    issue_type: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    customer_reply: { type: Type.STRING }
                },
                required: ["visible_observation", "issue_type", "severity", "customer_reply"]
            }
        }
    });

    res.json(JSON.parse(response.text!));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
