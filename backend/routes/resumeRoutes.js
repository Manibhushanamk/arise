import express from 'express';
import Resume from '../models/resumeModel.js';
import { protect } from '../server.js';

const router = express.Router();

// @desc    Create or Update user resume
// @route   POST /api/resume
router.post('/', protect, async (req, res, next) => {
    try {
        const resumeData = { ...req.body, userId: req.user._id };
        // The findOneAndUpdate with upsert option is a powerful Mongoose feature
        // It will update the resume if one exists for the user, or create it if it doesn't.
        const resume = await Resume.findOneAndUpdate(
            { userId: req.user._id },
            resumeData,
            { new: true, upsert: true }
        );
        res.status(201).json(resume);
    } catch (error) {
        next(error); // Pass errors to the central error handler
    }
});

// @desc    Get user resume
// @route   GET /api/resume
router.get('/', protect, async (req, res, next) => {
    try {
        const resume = await Resume.findOne({ userId: req.user._id });
        if (resume) {
            res.json(resume);
        } else {
            res.status(404);
            throw new Error('Resume not found. Please create one first.');
        }
    } catch (error) {
        next(error);
    }
});

export default router;