

import { GoogleGenAI } from "@google/genai";

export const generateCreativeText = async (prompt: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API key is missing. Please set the API_KEY environment variable.");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a creative assistant. Generate a creative and engaging piece of text based on the following prompt: ${prompt}`,
    });
    
    // Fix: Access the 'text' property directly instead of calling it as a function.
    // The Gemini API response object has a `text` property that holds the generated string.
    return response.text;
  } catch (error) {
    console.error("Error generating text with Gemini API:", error);
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return "An unexpected error occurred while generating the text.";
  }
};
