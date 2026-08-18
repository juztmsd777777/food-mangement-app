import mongoose from 'mongoose';

const donationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ngoId: { type: String, required: true },
    donorName: { type: String, required: true },
    donorContact: { type: String, required: true },
    donorAddress: { type: String, required: true },
    foodName: { type: String, required: true },
    foodType: { type: String, required: true },
    mealCount: { type: Number, required: true },
    pickupWindow: { type: String, required: true },
    expiryWindow: { type: String, required: true },
    notes: { type: String, default: '' },
    status: { type: String, default: 'OPEN' },
    createdAt: { type: String }
  },
  { timestamps: true }
);

export const Donation = mongoose.model('Donation', donationSchema);
