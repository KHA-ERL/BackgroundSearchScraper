import { ChatMistralAI } from "@langchain/mistralai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getMistralKey() {
  if (process.env.MISTRAL_API_KEY) return process.env.MISTRAL_API_KEY;
  const envFile = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, "utf-8");
    const m = content.match(/^MISTRAL_API_KEY=(.*)$/m);
    if (m) {
      process.env.MISTRAL_API_KEY = m[1].trim();
      return m[1].trim();
    }
  }
  return null;
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const apiKey = getMistralKey();

    if (!apiKey) {
      return NextResponse.json(
        { error: "MISTRAL_API_KEY is not configured in settings or environment." },
        { status: 400 }
      );
    }
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "A valid 'messages' array is required." }, { status: 400 });
    }

    const model = new ChatMistralAI({
      modelName: "mistral-large-latest",
      temperature: 0.1,
      apiKey: apiKey,
    });

    const scraperTool = {
      type: "function",
      function: {
        name: "execute_scraper",
        description: "Execute one of the 33 built-in scraper tools to fetch data on behalf of the user.",
        parameters: {
          type: "object",
          properties: {
            apiPath: {
              type: "string",
              description: "The API path of the relevant scraper tool. Options include: /api/google_map_scraper, /api/b2c_data, /api/facebook_scraper, /api/email_scraper, /api/phone_scraper, /api/indiamart_scraper, /api/justdial_scraper, /api/ecommerce_scraper, /api/document_scraper, /api/live_website. Map to the most logical tool based on user request."
            },
            payload: {
              type: "object",
              description: "The JSON body that must be sent to the API. It MUST contain a 'query' key representing the stripped-down, core search keyword (e.g., 'restaurants in London'). Do NOT include conversational text like 'I want 20 of...' in the query. For email scrapers or website scrapers, use the URL as the query.",
              properties: {
                query: { type: "string", description: "The exact search string to use, stripped of user chatter." },
                maxResults: { type: "number", description: "The number of results to fetch, if specified by the user." }
              },
              required: ["query"]
            }
          },
          required: ["apiPath", "payload"],
        }
      }
    };

    const modelWithTools = model.bindTools([scraperTool]);
    
    const systemInstruction = {
      role: "system", 
      content: `You are an elite, hacker-themed AI terminal agent for the BubbleScraper platform.
You have access to 33 scraping tools. You can only trigger ONE tool per response.

CRITICAL RULES FOR EXECUTION:
1. NO ASSUMPTIONS: If a user asks for data that a specific tool CANNOT provide, DO NOT EXECUTE THE TOOL blind. E.g., The Google Maps Scraper CANNOT extract emails. 
2. MULTI-STEP RECURSIVE PIPELINES: The system is a closed-loop recursive engine. If the user wants 3 restaurants AND their emails, you DO NOT need to reject it immediately. Instead, you can construct a pipeline!
   -> Step A: Call execute_scraper targeting /api/google_map_scraper to get the restaurants.
   -> (The system will intercept the tool, run it locally, and send you back a [SYSTEM BACKGROUND] data digest containing the websites).
   -> Step B: Read the background digest, extract the website URLs, and then call execute_scraper targeting /api/email_scraper with those URLs to fulfill the email requirement!
3. LOGICAL CHAINING: You are expected to string together tools sequentially if a single user prompt demands multiple extractions (e.g. "Do restaurants, then do jobs in Lagos"). Evaluate the [SYSTEM BACKGROUND] responses to build the next payload.
4. WHEN FINISHED: When all user instructions are fully satisfied across multiple tools, output a final confirming chat message. DO NOT call any more tools.`
    };

    const formattedMessages = [systemInstruction, ...messages];
    const response = await modelWithTools.invoke(formattedMessages);

    return NextResponse.json({
      success: true,
      message: response.content || "",
      toolCalls: response.tool_calls || []
    });
  } catch (error) {
    console.error("AI Router error:", error);
    return NextResponse.json({ error: error.message || "Failed to process AI routing." }, { status: 500 });
  }
}
