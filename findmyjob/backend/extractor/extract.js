import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

// -------------------
// ENV
// -------------------
const HF_API_KEY = process.env.HF_API_KEY;
const SERVER_INGEST = process.env.SERVER_INGEST || "http://localhost:3001/ingest";

// -------------------
// Clean HTML
// -------------------
function cleanHTML(rawHTML) {
  const $ = cheerio.load(rawHTML);
  $("script, style, noscript, svg, iframe, meta, link").remove();
  let cleaned = $.text().replace(/\s+/g, " ").trim();
  return cleaned;
}

// -------------------
// Split HTML into chunks
// -------------------
function chunkText(text, maxLength = 15000) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxLength));
    start += maxLength;
  }
  return chunks;
}

// -------------------
// Call HuggingFace Router API
// -------------------
async function callHF(cleanHtmlChunk) {
  if (!HF_API_KEY) {
    console.log("❌ Missing HF_API_KEY");
    return { jobs: [] };
  }

  const prompt = `
Extract job openings into an array "jobs" in EXACT JSON format:

{
  "jobs": [
    {
      "title": "...",
      "location": "...",
      "experience": "...",
      "skills": "...",
      "description": "...",
      "apply_url": "...",
      "posted_date": "..."
    }
  ]
}

If no jobs found in this chunk, return:
{ "jobs": [] }

CONTENT:
${cleanHtmlChunk}
`;

  try {
    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-70B-Instruct",
        messages: [
          { role: "system", content: "Return ONLY valid JSON. No text outside JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.log("❌ HF Router Error:", text);
      return { jobs: [] };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { jobs: [] };

    try {
      const parsed = JSON.parse(content);
      return parsed.jobs ? parsed : { jobs: [] };
    } catch (err) {
      console.log("⚠️ JSON parse failed, returning empty array:", err.message);
      return { jobs: [] };
    }

  } catch (err) {
    console.log("❌ HF call failed:", err.message);
    return { jobs: [] };
  }
}

// -------------------
// Extract endpoint
// -------------------
app.post("/extract", async (req, res) => {
  try {
    const { html, source_url, fingerprint } = req.body;
    if (!html) return res.status(400).json({ ok: false, error: "Missing HTML" });

    const cleanedHTML = cleanHTML(html);
    const chunks = chunkText(cleanedHTML);

    let allJobs = [];

    for (const chunk of chunks) {
      const result = await callHF(chunk);
      allJobs = allJobs.concat(result.jobs || []);
    }

    console.log("➡️ Total jobs extracted from all chunks:", allJobs.length);

    const payload = {
      jobs: allJobs.map((j) => ({ ...j, source_url, fingerprint }))
    };

    // Send to ingestion server
    try {
      await fetch(SERVER_INGEST, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.log("❌ Failed to send jobs to ingestion server:", err.message);
    }

    res.json({ ok: true, ingested: payload.jobs.length });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -------------------
// Start server
// -------------------
app.listen(5001, () => console.log("🚀 Extractor running on port 5001"));
