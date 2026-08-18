import mongoose from 'mongoose';

const volunteerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    verified: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: false },
    zone: { type: String, required: true },
    phone: { type: String, required: true },
    vehicle: { type: String, default: 'Bike' },
    idProof: { type: String, default: '' },
    rating: { type: Number, default: 0 },
    runsCompleted: { type: Number, default: 0 },
    appliedAt: { type: String },
    verifiedAt: { type: String, default: null }
  },
  { timestamps: true }
);

export const Volunteer = mongoose.model('Volunteer', volunteerSchema);
