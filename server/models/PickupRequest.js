import mongoose from 'mongoose';

const pickupRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    donationId: { type: String, required: true },
    volunteerId: { type: String, required: true },
    ngoId: { type: String, required: true },
    status: { type: String, default: 'PENDING_NGO' },
    createdAt: { type: String },
    approvedAt: { type: String, default: null }
  },
  { timestamps: true }
);

export const PickupRequest = mongoose.model('PickupRequest', pickupRequestSchema);
