import mongoose from 'mongoose';

const inventoryRequestSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    inventoryId: { type: String, required: true },
    volunteerId: { type: String, required: true },
    ngoId: { type: String, required: true },
    destination: { type: String, required: true },
    peopleTarget: { type: Number, required: true },
    status: { type: String, default: 'PENDING_NGO' },
    createdAt: { type: String },
    approvedAt: { type: String, default: null }
  },
  { timestamps: true }
);

export const InventoryRequest = mongoose.model('InventoryRequest', inventoryRequestSchema);
