// ----------------------------------------
// SECTION 1: CONFIG & IMPORTS
// ----------------------------------------
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { GoogleGenAI } from "@google/genai";
import path from 'path';
import config from './config.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const client = new OAuth2Client(config.GOOGLE_CLIENT_ID);
const ai = new GoogleGenAI({ apiKey: config.API_KEY });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ----------------------------------------
// SECTION 2: MONGODB CONNECTION
// ----------------------------------------
mongoose.connect(config.MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));


// ----------------------------------------
// SECTION 3: SCHEMAS & MODELS
// ----------------------------------------

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Not required for Google Sign-In
    googleId: { type: String },
    name: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rolePreferences: [String],
    qualification: String,
    fieldOfStudy: String,
    preferredSectors: [String],
    workPreference: String,
    duration: String,
    skills: [String],
    freeTextSkills: String,
    digitalConfidence: String,
    additionalInfo: String,
}, { timestamps: true });
const Assignment = mongoose.model('Assignment', assignmentSchema);

// Resume Schema
const resumeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    personalInfo: {
        name: String,
        email: String,
        phone: String,
        linkedin: String,
    },
    summary: String,
    education: [{
        institution: String,
        degree: String,
        field: String,
        gradYear: String,
    }],
    experience: [{
        company: String,
        role: String,
        duration: String,
        description: String,
    }],
    projects: [{
        title: String,
        description: String,
        link: String,
    }],
    skills: [String],
}, { timestamps: true });
const Resume = mongoose.model('Resume', resumeSchema);

// Role Schema
const roleSchema = new mongoose.Schema({
    title: String,
    description: String,
    salary: String,
    skillsRequired: [String],
    applyLink: String,
});
const Role = mongoose.model('Role', roleSchema);

// Skill Resource Schema
const skillResourceSchema = new mongoose.Schema({
    skillName: { type: String, required: true, unique: true },
    youtubeLink: String,
    docsLink: String,
    practiceLink: String,
});
const SkillResource = mongoose.model('SkillResource', skillResourceSchema);


// ----------------------------------------
// SECTION 4: AUTH MIDDLEWARE
// ----------------------------------------
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};


// ----------------------------------------
// SECTION 5: AUTH ROUTES
// ----------------------------------------

// Signup
app.post('/auth/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, name: user.name });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid email or password.' });

        const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, name: user.name });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// Google Login
app.post('/auth/google', async (req, res) => {
    try {
        const { token: googleToken } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: googleToken,
            audience: config.GOOGLE_CLIENT_ID,
        });
        const { name, email, sub } = ticket.getPayload();

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ name, email, googleId: sub });
            await user.save();
        }

        const token = jwt.sign({ userId: user._id, name: user.name, email: user.email }, config.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, name: user.name });
    } catch (error) {
        res.status(500).json({ message: 'Google authentication failed.', error });
    }
});


// ----------------------------------------
// SECTION 6: ASSIGNMENT ROUTES
// ----------------------------------------
app.post('/assignment', authMiddleware, async (req, res) => {
    try {
        const assignmentData = { ...req.body, userId: req.user.userId };
        const assignment = await Assignment.findOneAndUpdate(
            { userId: req.user.userId },
            assignmentData,
            { new: true, upsert: true }
        );
        res.status(201).json({ message: 'Assignment saved successfully!', assignment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.get('/assignment', authMiddleware, async (req, res) => {
    try {
        const assignment = await Assignment.findOne({ userId: req.user.userId });
        if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// ----------------------------------------
// SECTION 7: RECOMMENDATIONS ROUTES
// ----------------------------------------
app.get('/recommendations', authMiddleware, async (req, res) => {
    try {
        const assignment = await Assignment.findOne({ userId: req.user.userId });
        if (!assignment) {
             const allRoles = await Role.find();
             return res.json(allRoles);
        }

        const userSkills = assignment.skills || [];
        const allRoles = await Role.find();

        const scoredRoles = allRoles.map(role => {
            const matchedSkills = role.skillsRequired.filter(skill => userSkills.includes(skill));
            const score = matchedSkills.length / role.skillsRequired.length;
            return { ...role.toObject(), score, missingSkills: role.skillsRequired.filter(skill => !userSkills.includes(skill)) };
        });

        scoredRoles.sort((a, b) => b.score - a.score);
        res.json(scoredRoles);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// ----------------------------------------
// SECTION 8: RESUME ROUTES
// ----------------------------------------
app.post('/resume', authMiddleware, async (req, res) => {
    try {
        const resumeData = { ...req.body, userId: req.user.userId };
        const resume = await Resume.findOneAndUpdate(
            { userId: req.user.userId },
            resumeData,
            { new: true, upsert: true }
        );
        res.status(201).json({ message: 'Resume saved successfully!', resume });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

app.get('/resume', authMiddleware, async (req, res) => {
    try {
        const resume = await Resume.findOne({ userId: req.user.userId });
        if (!resume) return res.status(404).json({ message: 'Resume not found.' });
        res.json(resume);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// ----------------------------------------
// SECTION 9: SKILL RESOURCE ROUTES
// ----------------------------------------
app.get('/resources/:skillName', async (req, res) => {
    try {
        const { skillName } = req.params;
        const resource = await SkillResource.findOne({ skillName: new RegExp(`^${skillName}$`, 'i') });
        if (!resource) return res.status(404).json({ message: 'Resource not found.' });
        res.json(resource);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});


// ----------------------------------------
// SECTION 10: CHATBOT ROUTE
// ----------------------------------------
app.post('/chatbot', authMiddleware, async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt is required.' });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are Arise, a friendly and helpful AI career assistant for students. Provide clear, concise, and encouraging advice. Keep your answers focused on career, skills, and job searching.",
            },
        });

        res.json({ reply: response.text });

    } catch (error) {
        console.error('Gemini API error:', error);
        res.status(500).json({ message: 'Failed to get response from AI assistant.' });
    }
});

// ----------------------------------------
// SECTION 11: SERVE STATIC FRONTEND
// ----------------------------------------
app.use(express.static(path.join(__dirname, '../arise-frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../arise-frontend', 'arise.html'));
});


// ----------------------------------------
// SERVER START
// ----------------------------------------
app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
});
