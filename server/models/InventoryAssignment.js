import mongoose from 'mongoose';

const inventoryAssignmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    requestId: { type: String, required: true },
    inventoryId: { type: String, required: true },
    volunteerId: { type: String, required: true },
    ngoId: { type: String, required: true },
    destination: { type: String, required: true },
    peopleTarget: { type: Number, required: true },
    status: { type: String, default: 'APPROVED_FOR_PICKUP' },
    peopleServed: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdAt: { type: String },
    pickedUpAt: { type: String, default: null },
    completedAt: { type: String, default: null }
  },
  { timestamps: true }
);

export const InventoryAssignment = mongoose.model('InventoryAssignment', inventoryAssignmentSchema);
