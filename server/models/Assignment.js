import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    requestId: { type: String, required: true },
    donationId: { type: String, required: true },
    volunteerId: { type: String, required: true },
    ngoId: { type: String, required: true },
    status: { type: String, default: 'APPROVED_FOR_PICKUP' },
    outcome: { type: String, default: null },
    peopleServed: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdAt: { type: String },
    pickedUpAt: { type: String, default: null },
    completedAt: { type: String, default: null }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model('Assignment', assignmentSchema);
