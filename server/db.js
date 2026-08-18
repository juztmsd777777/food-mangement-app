import mongoose from 'mongoose';
import {
  Ngo,
  Volunteer,
  Donor,
  Donation,
  PickupRequest,
  Assignment,
  Inventory,
  InventoryRequest,
  InventoryAssignment,
  Event
} from './models/index.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/food_management';
  try {
    await mongoose.connect(uri);
    console.log(`Connected to MongoDB database at: ${uri}`);
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

export async function wipeDatabase() {
  console.log('Wiping all database collections for a clean slate...');
  await Promise.all([
    Ngo.deleteMany({}),
    Volunteer.deleteMany({}),
    Donor.deleteMany({}),
    Donation.deleteMany({}),
    PickupRequest.deleteMany({}),
    Assignment.deleteMany({}),
    Inventory.deleteMany({}),
    InventoryRequest.deleteMany({}),
    InventoryAssignment.deleteMany({})
  ]);
  console.log('Database wiped clean. Ready for real user registration!');
}

export async function seedInitialData() {
  // Clean start
}
