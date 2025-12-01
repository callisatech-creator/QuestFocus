import { GoogleGenAI } from "@google/genai";
import { GeminiFeedback } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getSessionFeedback = async (
  durationMinutes: number,
  subject: string,
  level: number
): Promise<GeminiFeedback | null> => {
  const client = getClient();
  if (!client) return null;

  try {
    const prompt = `
      You are a wise and encouraging RPG Quest Master. 
      The user (Level ${level}) just completed a study session.
      
      Details:
      - Subject: "${subject}"
      - Duration: ${durationMinutes} minutes.
      
      Task:
      Generate a short, gamified message to reward them. 
      If the session was long (>45m), praise their endurance.
      If it was short (<10m), encourage them that every step counts.
      Use RPG terminology (XP, grinding, quests, skills).
      
      Output format: JSON with keys "message" (string) and "type" ("victory" | "encouragement" | "tip").
      Do not include markdown code blocks. Just the JSON string.
    `;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) return null;

    return JSON.parse(text) as GeminiFeedback;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback if API fails
    return {
      message: "Quest complete! Well done, adventurer.",
      type: "victory"
    };
  }
};