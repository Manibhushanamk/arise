import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  personalInfo: {
    name: String,
    email: String,
    phone: String,
    linkedin: String,
  },
  summary: String,
  education: [{
    id: String,
    institution: String,
    degree: String,
    field: String,
    gradYear: String,
  }],
  experience: [{
    id: String,
    company: String,
    role: String,
    duration: String,
    description: String,
  }],
  projects: [{
    id: String,
    title: String,
    description: String,
    link: String,
  }],
  skills: String,
}, { timestamps: true });

const Resume = mongoose.model('Resume', resumeSchema);
export default Resume;