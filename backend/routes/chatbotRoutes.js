import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// @desc    Handle chatbot conversation
// @route   POST /api/chatbot
router.post('/', protect, async (req, res, next) => {
    try {
        const { prompt, history } = req.body;
        if (!prompt) {
            res.status(400);
            throw new Error('Prompt is required.');
        }
        
        const chat = model.startChat({
            history: history || [], // Start the chat with the history from the frontend
        });

        // This system instruction is key to getting well-formatted, helpful responses
        const systemInstruction = `You are Arise, a friendly and expert AI career assistant for students in India. Your goal is to provide clear, encouraging, and actionable advice related to career development, job searching, resume building, and interview skills. Always structure your response in Markdown format. Use headings, bold text, and lists where appropriate to make the information easy to read and digest. Never use HTML tags.`;
        
        const result = await chat.sendMessage(systemInstruction + "\n\nUSER QUESTION: " + prompt);
        const response = result.response;
        const text = response.text();

        res.json({ reply: text });
    } catch (error) {
        next(error); // Pass any errors to the central error handler
    }
});

export default router;