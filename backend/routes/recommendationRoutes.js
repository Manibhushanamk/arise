import express from 'express';
import { GoogleGenerativeAI } from '@google/genai';
import Assignment from '../models/assignmentModel.js';
import Role from '../models/roleModel.js';
import SkillResource from '../models/skillResourceModel.js';
import { protect } from '../server.js';
import config from '../config.js';

const router = express.Router();
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

// --- AI-Powered Recommendation Logic ---
const getAiRecommendations = async (assignment) => {
    // Dynamically get a sample of all available roles to provide context to the AI
    const allRolesSample = await Role.aggregate([{ $sample: { size: 50 } }]); // Get a random sample of 50 roles
    const rolesContext = allRolesSample.map(r => `roleId: "${r.roleId}", title: "${r.title}", skills: [${r.skillsRequired.join(', ')}]`).join('; ');

    const prompt = `
        Analyze the following student profile and the list of available job roles.
        
        Student Profile:
        - Skills: ${assignment.skills.join(', ')}
        - Interests: ${assignment.interests.join(', ')}
        - Qualification: ${assignment.qualification}
        - Preferred Sectors: ${assignment.preferredSectors.join(', ')}
        - Location Preference: ${assignment.locationPreference}

        Available Roles Sample:
        ${rolesContext}

        Based on a deep understanding of skill relevance, interests, and qualifications, identify the top 5 most relevant roles for this student from the database.
        Return ONLY a valid JSON array of the top 5 "roleId" strings that are the best match. Do not include any other text, explanations, or markdown formatting.
        Example format: ["role123", "role456", "role789", "role101", "role112"]
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const roleIds = JSON.parse(text);
        if (!Array.isArray(roleIds)) return null;
        return await Role.find({ 'roleId': { $in: roleIds } });
    } catch (error) {
        console.error("AI Recommendation failed:", error);
        return null; // Return null on any failure to trigger the fallback
    }
};

// --- Fallback Logic: Simple Tag-Based Matching ---
const getFallbackRecommendations = async (assignment) => {
    const userSkills = new Set(assignment.skills);
    const allRoles = await Role.find().limit(50);

    const scoredRoles = allRoles.map(role => {
        const requiredSkills = new Set(role.skillsRequired);
        const matchedSkills = [...requiredSkills].filter(skill => userSkills.has(skill));
        const score = requiredSkills.size > 0 ? (matchedSkills.length / requiredSkills.size) : 0;
        return { ...role.toObject(), score };
    });

    scoredRoles.sort((a, b) => b.score - a.score);
    return scoredRoles.slice(0, 10);
};

// @desc    Get job recommendations
// @route   GET /api/recommendations
router.get('/', protect, async (req, res, next) => {
    try {
        const assignment = await Assignment.findOne({ userId: req.user._id });

        if (!assignment || !assignment.skills || assignment.skills.length === 0) {
            // If no assessment, return the most recently posted roles
            const defaultRoles = await Role.find().sort({ datePosted: -1 }).limit(10);
            return res.json(defaultRoles);
        }

        let recommendations = await getAiRecommendations(assignment);

        if (!recommendations || recommendations.length === 0) {
            console.log("AI failed or returned no results, using fallback logic.");
            recommendations = await getFallbackRecommendations(assignment);
        }
        
        res.json(recommendations);
    } catch (error) {
        next(error);
    }
});

// @desc    Get resources for a specific skill
// @route   GET /api/recommendations/resources/:skillName
router.get('/resources/:skillName', protect, async (req, res, next) => {
    try {
        const { skillName } = req.params;
        const resource = await SkillResource.findOne({ skillName: new RegExp(`^${skillName}$`, 'i') });
        if (resource) {
            res.json(resource);
        } else {
            res.status(404);
            throw new Error('Resource not found for this skill.');
        }
    } catch(error) {
        next(error);
    }
});

export default router;