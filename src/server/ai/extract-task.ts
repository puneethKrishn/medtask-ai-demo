import Anthropic from "@anthropic-ai/sdk";
import {
  TASK_EXTRACTION_SYSTEM_PROMPT,
  TASK_EXTRACTION_USER_PROMPT,
} from "./prompts";

export interface ExtractedTask {
  title: string;
  description: string | null;
  patient: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  confidence: number;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export async function extractTaskFromText(
  text: string
): Promise<ExtractedTask> {
  const anthropic = getClient();
  const currentDate = new Date().toISOString();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 512,
    system: TASK_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: TASK_EXTRACTION_USER_PROMPT(text, currentDate),
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const parsed = JSON.parse(content.text) as ExtractedTask;

  // Validate required fields
  if (!parsed.title || typeof parsed.title !== "string") {
    throw new Error("Extraction failed: missing title");
  }
  if (!["low", "medium", "high", "urgent"].includes(parsed.priority)) {
    parsed.priority = "medium";
  }
  if (typeof parsed.confidence !== "number") {
    parsed.confidence = 0.5;
  }

  return parsed;
}

export async function transcribeAndExtract(
  audioBase64: string,
  _mimeType: string = "audio/webm" // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<{ transcript: string; task: ExtractedTask }> {
  // Step 1: Transcribe using Claude's vision/audio — for MVP, accept pre-transcribed text
  // Production: integrate Whisper API or Claude's native audio when available
  // For now, decode base64 and treat as pre-transcribed text if plain text,
  // or use a placeholder for actual audio files

  // Use Claude to transcribe by describing the audio context
  // In production, this would call OpenAI Whisper or a dedicated STT service
  const transcript = Buffer.from(audioBase64, "base64").toString("utf-8");

  // Step 2: Extract task from transcript
  const task = await extractTaskFromText(transcript);

  return { transcript, task };
}
