import express from 'express';
import Assignment from '../models/assignmentModel.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Create or Update user assignment
// @route   POST /api/assignment
router.post('/', protect, async (req, res, next) => {
    try {
        const assignmentData = { ...req.body, userId: req.user._id };
        const assignment = await Assignment.findOneAndUpdate(
            { userId: req.user._id },
            assignmentData,
            { new: true, upsert: true } // upsert: true creates a new doc if none is found
        );
        res.status(201).json(assignment);
    } catch (error) {
        next(error);
    }
});

// @desc    Get user assignment
// @route   GET /api/assignment
router.get('/', protect, async (req, res, next) => {
    try {
        const assignment = await Assignment.findOne({ userId: req.user._id });
        if (assignment) {
            res.json(assignment);
        } else {
            res.status(404);
            throw new Error('Assessment not found. Please complete it first.');
        }
    } catch (error) {
        next(error);
    }
});

export default router;