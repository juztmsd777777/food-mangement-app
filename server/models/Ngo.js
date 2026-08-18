import mongoose from 'mongoose';

const ngoSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    zone: { type: String, required: true },
    address: { type: String, required: true },
    storageCapacity: { type: Number, required: true, default: 500 },
    contact: { type: String, required: true }
  },
  { timestamps: true }
);

export const Ngo = mongoose.model('Ngo', ngoSchema);
