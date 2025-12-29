
import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = 'gemini-3-flash-preview';

/**
 * Sends a text query to the virtual AI mycologist.
 */
export const askMycologist = async (question: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: question,
      config: {
        systemInstruction: "你是一位专门为家庭种植者提供指导的真菌学专家。你的回答应该建立在严谨的生物学基础上，同时给出的操作建议要适合家庭环境（如厨房、阳台或帐篷）。如果用户询问有关食用安全的问题，请始终提醒他们：无法 100% 确认品种时严禁食用。"
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini 聊天错误:", error);
    throw error;
  }
};
