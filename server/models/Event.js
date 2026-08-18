import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: String, required: true }
  },
  { timestamps: true }
);

export const Event = mongoose.model('Event', eventSchema);
