import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  roleId: { type: String, unique: true }, // A unique ID from the portal if available
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: String,
  stipend: String,
  duration: String,
  description: String,
  skillsRequired: [String],
  applyLink: String,
  datePosted: { type: Date, default: Date.now },
});

// Create a text index for fast text-based searching
roleSchema.index({ title: 'text', description: 'text', skillsRequired: 'text', company: 'text' });

const Role = mongoose.model('Role', roleSchema);
export default Role;