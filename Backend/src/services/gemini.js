import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });

export async function askGemini(prompt) {
    const result = await model.generateContent(prompt);
    return result.response.text();
}
