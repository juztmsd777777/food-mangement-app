import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contact: { type: String, required: true },
    address: { type: String, required: true }
  },
  { timestamps: true }
);

export const Donor = mongoose.model('Donor', donorSchema);
