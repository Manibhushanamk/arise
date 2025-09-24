import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Core Fields
  skills: [String],
  interests: [String], // e.g., AI, Web Development, Marketing
  // PM Internship Portal Fields
  qualification: String, // e.g., B.Tech, MBA
  fieldOfStudy: String, // e.g., Computer Science
  preferredSectors: [String], // e.g., IT, Healthcare, Finance
  locationPreference: { type: String, enum: ['Work from Home', 'In-office', 'Hybrid'], default: 'Hybrid' },
  statePreference: [String], // e.g., Telangana, Maharashtra
  cityPreference: [String], // e.g., Hyderabad, Pune
  durationPreference: { type: String, enum: ['1 Month', '2 Months', '3 Months', '6 Months'], default: '3 Months' },
  stipendExpectation: { type: String, enum: ['Any', 'Paid', '10k+', '20k+'], default: 'Any' },
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;