import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import pdf from "pdf-parse";
import { SYSTEM_PROMPT, ANALYSIS_PROMPT } from "@/lib/prompts";
import { AnalysisResult, ComparisonResponse } from "@/lib/types";
import { isSafeUrl, validateAnalysis, sanitizePromptContent } from "@/lib/security";

const MAX_RESUMES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_JD_LENGTH = 10000;

export const maxDuration = 60; // Set timeout to 60 seconds for Vercel

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("resumes") as File[];
    const jobDescription = formData.get("jobDescription") as string;
    
    // Configuration from UI
    const provider = (formData.get("provider") as string) || "gemini";
    const userModel = formData.get("model") as string;
    const userApiKey = formData.get("apiKey") as string;
    const baseUrl = formData.get("baseUrl") as string;

    // 1. Validation
    if (!userApiKey) {
      return NextResponse.json(
        { error: "API Key is required. This application uses a 'Bring Your Own Key' model." },
        { status: 401 }
      );
    }

    if (baseUrl && provider === "openai-compatible" && !isSafeUrl(baseUrl)) {
      return NextResponse.json(
        { error: "Invalid or insecure Base URL provided." },
        { status: 400 }
      );
    }

    // 2. Input Validation
    if (!files.length || !jobDescription) {
      return NextResponse.json(
        { error: "At least one resume and a job description are required." },
        { status: 400 }
      );
    }

    if (files.length > MAX_RESUMES) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_RESUMES} resumes allowed at once.` },
        { status: 400 }
      );
    }

    if (jobDescription.length > MAX_JD_LENGTH) {
      return NextResponse.json(
        { error: "Job description is too long." },
        { status: 400 }
      );
    }

    const results: AnalysisResult[] = [];

    for (const file of files) {
      try {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File size too large.`);
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error(`Invalid file type.`);
        }

        // 3. PDF Parsing with safety
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Basic protection against zip bombs / extreme compression
        if (buffer.length > MAX_FILE_SIZE * 1.5) {
          throw new Error("Potential decompression bomb detected.");
        }

        const pdfData = await pdf(buffer);
        const resumeText = sanitizePromptContent(pdfData.text.slice(0, 50000)); // Truncate and sanitize extreme text
        const sanitizedJobDescription = sanitizePromptContent(jobDescription);

        let rawAnalysis: any;

        // 4. Multi-Provider Routing
        if (provider === "gemini") {
          const genAI = new GoogleGenerativeAI(userApiKey);
          const modelName = userModel || "gemini-1.5-flash";
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { responseMimeType: "application/json" },
          });

          const result = await model.generateContent([
            SYSTEM_PROMPT,
            ANALYSIS_PROMPT(resumeText, sanitizedJobDescription),
          ]);

          rawAnalysis = JSON.parse(result.response.text());

        } else if (provider === "openai" || provider === "openai-compatible") {
          const openai = new OpenAI({
            apiKey: userApiKey,
            baseURL: baseUrl || undefined,
          });

          const modelName = userModel || (provider === "openai" ? "gpt-4o-mini" : "");
          if (!modelName) throw new Error("Model selection required.");

          const response = await openai.chat.completions.create({
            model: modelName,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: ANALYSIS_PROMPT(resumeText, sanitizedJobDescription) },
            ],
            response_format: { type: "json_object" },
          });

          const content = response.choices[0].message.content;
          if (!content) throw new Error("No response from provider.");
          rawAnalysis = JSON.parse(content);

        } else if (provider === "anthropic") {
          const anthropic = new Anthropic({ apiKey: userApiKey });
          const modelName = userModel || "claude-3-5-sonnet-20240620";

          const response = await anthropic.messages.create({
            model: modelName,
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [
              { role: "user", content: ANALYSIS_PROMPT(resumeText, sanitizedJobDescription) },
            ],
          });


          const content = (response.content[0] as any).text;
          rawAnalysis = JSON.parse(content);
        }

        // 5. Elite Output Validation & Sanitization
        const analysis = validateAnalysis(rawAnalysis);

        results.push({
          fileName: file.name,
          ...analysis,
        });
      } catch (fileError: any) {
        // Log generic error internally without leaking details
      }
    }

    return NextResponse.json({ results } as ComparisonResponse);
  } catch (error: any) {
    // Detect AI Provider specific errors
    const errorMessage = error.message?.toLowerCase() || "";
    
    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return NextResponse.json(
        { error: "API Rate Limit Exceeded. Please wait a moment or use a different key." },
        { status: 429 }
      );
    }

    if (errorMessage.includes("401") || errorMessage.includes("invalid api key") || errorMessage.includes("unauthorized")) {
      return NextResponse.json(
        { error: "Invalid API Key. Please check your credentials in the settings panel." },
        { status: 401 }
      );
    }

    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      return NextResponse.json(
        { error: "AI Provider is currently overloaded. Please try again in a few seconds." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "An internal security or processing error occurred." },
      { status: 500 }
    );
  }
}


