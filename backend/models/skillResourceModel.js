import mongoose from 'mongoose';

const skillResourceSchema = new mongoose.Schema({
  skillName: { type: String, required: true, unique: true, trim: true },
  youtubeLink: String,
  docsLink: String,
  practiceLink: String,
});

const SkillResource = mongoose.model('SkillResource', skillResourceSchema);
export default SkillResource;