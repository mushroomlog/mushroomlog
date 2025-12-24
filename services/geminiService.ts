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
            请根据这张最新的生长照片，从以下维度分析并给出建议：
            1. 健康评估：观察菌丝覆盖率、颜色（是否有异常发黄或变黑）及子实体发育情况。
            2. 风险预警：识别是否存在霉菌污染（绿霉、黑霉等）或由于通风/湿度不当引起的畸形。
            3. 行动建议：下一步应该增加雾化、加强通风还是准备采收？
            
            要求：语气专业、客观，回答必须简练有力，使用 Markdown 格式。`
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
        systemInstruction: "你是一位专门为家庭种植者提供指导的真菌学专家。你的回答应该建立在严谨的生物学基础上，同时给出的操作建议要适合家庭环境（如厨房、阳台或帐篷）。如果用户询问有关食用安全的问题，请始终提醒他们：无法 100% 确认品种时严禁食用。"
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini 聊天错误:", error);
    throw error;
  }
};