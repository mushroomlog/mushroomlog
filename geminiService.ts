
import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = 'gemini-3-flash-preview';

export const analyzeGrowImage = async (base64Image: string, promptText: string = "Analyze this mushroom grow.") => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `你是一位专业的真菌学家。${promptText}。
            请根据照片提供：
            1. 生长健康评估。
            2. 污染风险预警。
            3. 具体操作建议。
            语气专业且简练。`
          }
        ]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini 图像分析错误:", error);
    throw error;
  }
};

export const askMycologist = async (question: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: question,
      config: {
        systemInstruction: "你是一位帮助家庭种植者的真菌学专家。回答要科学、平易近人。"
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini 聊天错误:", error);
    throw error;
  }
};
