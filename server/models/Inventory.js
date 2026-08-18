import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    ngoId: { type: String, required: true },
    sourceDonationId: { type: String, default: null },
    foodName: { type: String, required: true },
    foodType: { type: String, required: true },
    mealCount: { type: Number, required: true },
    expiryWindow: { type: String, required: true },
    status: { type: String, default: 'AVAILABLE' },
    createdAt: { type: String }
  },
  { timestamps: true }
);

export const Inventory = mongoose.model('Inventory', inventorySchema);
