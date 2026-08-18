import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { connectDB, wipeDatabase } from './db.js';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

async function addEvent(type, text) {
  await Event.create({
    id: id('EVT'),
    type,
    text,
    createdAt: now()
  });
}

async function publicState() {
  const [
    ngos,
    volunteers,
    donations,
    pickupRequests,
    assignments,
    inventory,
    inventoryRequests,
    inventoryAssignments,
    events
  ] = await Promise.all([
    Ngo.find().lean(),
    Volunteer.find().lean(),
    Donation.find().lean(),
    PickupRequest.find().lean(),
    Assignment.find().lean(),
    Inventory.find().lean(),
    InventoryRequest.find().lean(),
    InventoryAssignment.find().lean(),
    Event.find().sort({ createdAt: -1 }).limit(30).lean()
  ]);

  const openDonations = donations.filter((donation) => donation.status === 'OPEN').length;
  const ngoStoredMeals = inventory
    .filter((item) => item.status === 'AVAILABLE' || item.status === 'REQUESTED')
    .reduce((sum, item) => sum + Number(item.mealCount || 0), 0);
  const mealsDistributed =
    assignments
      .filter((assignment) => assignment.status === 'COMPLETED' && assignment.outcome === 'DISTRIBUTED')
      .reduce((sum, assignment) => sum + Number(assignment.peopleServed || 0), 0) +
    inventoryAssignments
      .filter((assignment) => assignment.status === 'COMPLETED')
      .reduce((sum, assignment) => sum + Number(assignment.peopleServed || 0), 0);

  return {
    ngos,
    volunteers,
    donations,
    pickupRequests,
    assignments,
    inventory,
    inventoryRequests,
    inventoryAssignments,
    events,
    metrics: {
      activeDonations: openDonations,
      pendingNgoApprovals:
        pickupRequests.filter((request) => request.status === 'PENDING_NGO').length +
        inventoryRequests.filter((request) => request.status === 'PENDING_NGO').length,
      pendingVolunteerVerifications: volunteers.filter((volunteer) => !volunteer.verified).length,
      inTransit:
        assignments.filter((assignment) => assignment.status === 'IN_TRANSIT').length +
        inventoryAssignments.filter((assignment) => assignment.status === 'IN_TRANSIT').length,
      ngoStoredMeals,
      mealsDistributed
    }
  };
}

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || String(body[field]).trim() === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'food-rescue-api-mongodb' });
});

app.get('/api/bootstrap', async (_req, res, next) => {
  try {
    const state = await publicState();
    res.json(state);
  } catch (error) {
    next(error);
  }
});

app.post('/api/demo/wipe', async (_req, res, next) => {
  try {
    await wipeDatabase();
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.post('/api/demo/reset', async (_req, res, next) => {
  try {
    await wipeDatabase();
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

// Registration API Endpoint with Email & Password
app.post('/api/auth/register', async (req, res, next) => {
  try {
    requireFields(req.body, ['role', 'email', 'password']);
    const { role } = req.body;
    const emailClean = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if (role === 'ngo') {
      requireFields(req.body, ['name', 'zone', 'address', 'contact']);
      const existing = await Ngo.findOne({ email: emailClean });
      if (existing) {
        return res.status(409).json({ error: 'An NGO account with this email is already registered.' });
      }

      const ngo = await Ngo.create({
        id: id('NGO'),
        name: req.body.name.trim(),
        email: emailClean,
        password: password,
        zone: req.body.zone.trim(),
        address: req.body.address.trim(),
        storageCapacity: Number(req.body.storageCapacity || 500),
        contact: req.body.contact.trim()
      });

      await addEvent('NGO_REGISTERED', `NGO "${ngo.name}" registered in ${ngo.zone}.`);

      return res.status(201).json({
        user: {
          role: 'ngo',
          id: ngo.id,
          name: ngo.name,
          email: ngo.email,
          zone: ngo.zone,
          address: ngo.address,
          contact: ngo.contact,
          storageCapacity: ngo.storageCapacity
        },
        state: await publicState()
      });
    }

    if (role === 'volunteer') {
      requireFields(req.body, ['name', 'phone', 'zone', 'vehicle', 'idProof']);
      const existing = await Volunteer.findOne({ email: emailClean });
      if (existing) {
        return res.status(409).json({ error: 'A volunteer account with this email is already registered.' });
      }

      const volunteer = await Volunteer.create({
        id: id('VOL'),
        name: req.body.name.trim(),
        email: emailClean,
        password: password,
        phone: req.body.phone.trim(),
        zone: req.body.zone.trim(),
        vehicle: req.body.vehicle.trim(),
        idProof: req.body.idProof.trim(),
        verified: false,
        rating: 0,
        runsCompleted: 0,
        appliedAt: now(),
        verifiedAt: null
      });

      await addEvent('VOLUNTEER_REGISTERED', `${volunteer.name} registered as volunteer in ${volunteer.zone}.`);

      return res.status(201).json({
        user: {
          role: 'volunteer',
          id: volunteer.id,
          name: volunteer.name,
          email: volunteer.email,
          phone: volunteer.phone,
          zone: volunteer.zone,
          vehicle: volunteer.vehicle,
          idProof: volunteer.idProof,
          verified: false
        },
        state: await publicState()
      });
    }

    if (role === 'donor') {
      requireFields(req.body, ['name', 'contact', 'address']);
      const existing = await Donor.findOne({ email: emailClean });
      if (existing) {
        return res.status(409).json({ error: 'A donor account with this email is already registered.' });
      }

      const donor = await Donor.create({
        id: id('DNR'),
        name: req.body.name.trim(),
        email: emailClean,
        password: password,
        contact: req.body.contact.trim(),
        address: req.body.address.trim()
      });

      await addEvent('DONOR_REGISTERED', `Donor "${donor.name}" joined the platform.`);

      return res.status(201).json({
        user: {
          role: 'donor',
          id: donor.id,
          name: donor.name,
          email: donor.email,
          contact: donor.contact,
          address: donor.address
        },
        state: await publicState()
      });
    }

    return res.status(400).json({ error: 'Invalid registration role.' });
  } catch (error) {
    next(error);
  }
});

// Login API Endpoint with Strict Email & Password Authorization
app.post('/api/auth/login', async (req, res, next) => {
  try {
    requireFields(req.body, ['role', 'email', 'password']);
    const { role } = req.body;
    const emailClean = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    if (role === 'ngo') {
      const ngo = await Ngo.findOne({ email: emailClean });
      if (!ngo) return res.status(404).json({ error: 'NGO account with this email was not found. Please Sign Up first.' });
      if (ngo.password !== password) return res.status(401).json({ error: 'Incorrect password for NGO account. Please try again.' });

      return res.json({
        user: {
          role: 'ngo',
          id: ngo.id,
          name: ngo.name,
          email: ngo.email,
          zone: ngo.zone,
          address: ngo.address,
          contact: ngo.contact,
          storageCapacity: ngo.storageCapacity
        },
        state: await publicState()
      });
    }

    if (role === 'volunteer') {
      const volunteer = await Volunteer.findOne({ email: emailClean });
      if (!volunteer) return res.status(404).json({ error: 'Volunteer account with this email was not found. Please Sign Up first.' });
      if (volunteer.password !== password) return res.status(401).json({ error: 'Incorrect password for volunteer account. Please try again.' });

      return res.json({
        user: {
          role: 'volunteer',
          id: volunteer.id,
          name: volunteer.name,
          email: volunteer.email,
          phone: volunteer.phone,
          zone: volunteer.zone,
          vehicle: volunteer.vehicle,
          idProof: volunteer.idProof,
          verified: volunteer.verified
        },
        state: await publicState()
      });
    }

    if (role === 'donor') {
      const donor = await Donor.findOne({ email: emailClean });
      if (!donor) return res.status(404).json({ error: 'Donor account with this email was not found. Please Sign Up first.' });
      if (donor.password !== password) return res.status(401).json({ error: 'Incorrect password for donor account. Please try again.' });

      return res.json({
        user: {
          role: 'donor',
          id: donor.id,
          name: donor.name,
          email: donor.email,
          contact: donor.contact,
          address: donor.address
        },
        state: await publicState()
      });
    }

    return res.status(400).json({ error: 'Invalid user role requested.' });
  } catch (error) {
    next(error);
  }
});

app.post('/api/donations', async (req, res, next) => {
  try {
    requireFields(req.body, [
      'ngoId',
      'donorName',
      'donorContact',
      'donorAddress',
      'foodName',
      'foodType',
      'mealCount',
      'pickupWindow',
      'expiryWindow'
    ]);

    const ngo = await Ngo.findOne({ id: req.body.ngoId });
    if (!ngo) return res.status(404).json({ error: 'Selected NGO was not found.' });

    const donation = await Donation.create({
      id: id('DON'),
      ngoId: req.body.ngoId,
      donorName: req.body.donorName.trim(),
      donorContact: req.body.donorContact.trim(),
      donorAddress: req.body.donorAddress.trim(),
      foodName: req.body.foodName.trim(),
      foodType: req.body.foodType.trim(),
      mealCount: Number(req.body.mealCount),
      pickupWindow: req.body.pickupWindow.trim(),
      expiryWindow: req.body.expiryWindow.trim(),
      notes: req.body.notes?.trim() || '',
      status: 'OPEN',
      createdAt: now()
    });

    await addEvent('DONATION_CREATED', `${donation.donorName} listed ${donation.mealCount} meals for ${ngo.name}.`);
    res.status(201).json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.post('/api/volunteers/apply', async (req, res, next) => {
  try {
    requireFields(req.body, ['name', 'email', 'phone', 'zone', 'vehicle', 'idProof']);
    const existing = await Volunteer.findOne({
      $or: [
        { email: new RegExp(`^${req.body.email.trim()}$`, 'i') },
        { phone: req.body.phone.trim() }
      ]
    });
    if (existing) {
      return res.status(409).json({ error: 'A volunteer with this email or phone already exists.' });
    }

    const volunteer = await Volunteer.create({
      id: id('VOL'),
      name: req.body.name.trim(),
      email: req.body.email.trim(),
      phone: req.body.phone.trim(),
      zone: req.body.zone.trim(),
      vehicle: req.body.vehicle.trim(),
      idProof: req.body.idProof.trim(),
      verified: false,
      rating: 0,
      runsCompleted: 0,
      appliedAt: now(),
      verifiedAt: null
    });

    await addEvent('VOLUNTEER_APPLIED', `${volunteer.name} submitted verification for ${volunteer.zone}.`);
    res.status(201).json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/volunteers/:volunteerId/verify', async (req, res, next) => {
  try {
    const volunteer = await Volunteer.findOne({ id: req.params.volunteerId });
    if (!volunteer) return res.status(404).json({ error: 'Volunteer was not found.' });
    if (volunteer.verified) return res.status(409).json({ error: 'Volunteer is already verified.' });

    volunteer.verified = true;
    volunteer.verifiedAt = now();
    volunteer.rating = volunteer.rating || 4.8;
    await volunteer.save();

    await addEvent('VOLUNTEER_VERIFIED', `${volunteer.name} was verified for pickup requests.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.post('/api/pickup-requests', async (req, res, next) => {
  try {
    requireFields(req.body, ['donationId', 'volunteerId']);
    const volunteer = await Volunteer.findOne({ id: req.body.volunteerId });
    const donation = await Donation.findOne({ id: req.body.donationId });

    if (!volunteer) return res.status(404).json({ error: 'Volunteer was not found.' });
    if (!volunteer.verified) return res.status(403).json({ error: 'Only verified volunteers can request pickups.' });
    if (!donation) return res.status(404).json({ error: 'Donation was not found.' });
    if (!['OPEN', 'REQUESTED'].includes(donation.status)) {
      return res.status(409).json({ error: 'This donation is already assigned or closed.' });
    }

    const duplicate = await PickupRequest.findOne({
      donationId: donation.id,
      volunteerId: volunteer.id,
      status: 'PENDING_NGO'
    });
    if (duplicate) return res.status(409).json({ error: 'You already requested this pickup.' });

    const request = await PickupRequest.create({
      id: id('REQ'),
      donationId: donation.id,
      volunteerId: volunteer.id,
      ngoId: donation.ngoId,
      status: 'PENDING_NGO',
      createdAt: now()
    });

    donation.status = 'REQUESTED';
    await donation.save();

    await addEvent('PICKUP_REQUESTED', `${volunteer.name} requested pickup for ${donation.foodName}.`);
    res.status(201).json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/pickup-requests/:requestId/approve', async (req, res, next) => {
  try {
    const request = await PickupRequest.findOne({ id: req.params.requestId });
    if (!request) return res.status(404).json({ error: 'Pickup request was not found.' });
    if (request.status !== 'PENDING_NGO') return res.status(409).json({ error: 'Request is not pending approval.' });

    const donation = await Donation.findOne({ id: request.donationId });
    const volunteer = await Volunteer.findOne({ id: request.volunteerId });
    const ngo = await Ngo.findOne({ id: request.ngoId });
    if (!donation || !volunteer || !ngo) return res.status(404).json({ error: 'Related workflow record is missing.' });

    request.status = 'APPROVED';
    request.approvedAt = now();
    await request.save();

    await PickupRequest.updateMany(
      { donationId: donation.id, id: { $ne: request.id }, status: 'PENDING_NGO' },
      { status: 'DECLINED' }
    );

    await Assignment.create({
      id: id('ASN'),
      requestId: request.id,
      donationId: donation.id,
      volunteerId: volunteer.id,
      ngoId: ngo.id,
      status: 'APPROVED_FOR_PICKUP',
      outcome: null,
      peopleServed: 0,
      notes: '',
      createdAt: now()
    });

    donation.status = 'ASSIGNED';
    await donation.save();

    await addEvent('REQUEST_APPROVED', `${ngo.name} approved ${volunteer.name} for ${donation.foodName}.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/assignments/:assignmentId/pick-up', async (req, res, next) => {
  try {
    const assignment = await Assignment.findOne({ id: req.params.assignmentId });
    if (!assignment) return res.status(404).json({ error: 'Assignment was not found.' });
    if (assignment.status !== 'APPROVED_FOR_PICKUP') {
      return res.status(409).json({ error: 'Assignment is not ready for pickup.' });
    }

    const donation = await Donation.findOne({ id: assignment.donationId });
    assignment.status = 'IN_TRANSIT';
    assignment.pickedUpAt = now();
    await assignment.save();

    if (donation) {
      donation.status = 'PICKED_UP';
      await donation.save();
    }

    await addEvent('FOOD_PICKED_UP', `Food pickup started for ${donation?.foodName || assignment.donationId}.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/assignments/:assignmentId/complete', async (req, res, next) => {
  try {
    requireFields(req.body, ['outcome']);
    const assignment = await Assignment.findOne({ id: req.params.assignmentId });
    if (!assignment) return res.status(404).json({ error: 'Assignment was not found.' });
    if (assignment.status !== 'IN_TRANSIT') {
      return res.status(409).json({ error: 'Assignment must be picked up before completion.' });
    }

    const donation = await Donation.findOne({ id: assignment.donationId });
    const ngo = await Ngo.findOne({ id: assignment.ngoId });
    assignment.status = 'COMPLETED';
    assignment.outcome = req.body.outcome;
    assignment.peopleServed = Number(req.body.peopleServed || donation?.mealCount || 0);
    assignment.notes = req.body.notes?.trim() || '';
    assignment.completedAt = now();
    await assignment.save();

    if (donation && req.body.outcome === 'DISTRIBUTED') {
      donation.status = 'DISTRIBUTED';
      await donation.save();
      await addEvent('FOOD_DISTRIBUTED', `${donation.foodName} was distributed to people in need.`);
    } else if (donation) {
      donation.status = 'STORED_AT_NGO';
      await donation.save();

      await Inventory.create({
        id: id('INV'),
        ngoId: assignment.ngoId,
        sourceDonationId: donation.id,
        foodName: donation.foodName,
        foodType: donation.foodType,
        mealCount: donation.mealCount,
        expiryWindow: donation.expiryWindow,
        status: 'AVAILABLE',
        createdAt: now()
      });
      await addEvent('FOOD_STORED', `${donation.foodName} was dropped at ${ngo?.name || 'the NGO'} for a second run.`);
    }

    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.post('/api/inventory-requests', async (req, res, next) => {
  try {
    requireFields(req.body, ['inventoryId', 'volunteerId', 'destination']);
    const volunteer = await Volunteer.findOne({ id: req.body.volunteerId });
    const inventory = await Inventory.findOne({ id: req.body.inventoryId });

    if (!volunteer) return res.status(404).json({ error: 'Volunteer was not found.' });
    if (!volunteer.verified) return res.status(403).json({ error: 'Only verified volunteers can request inventory runs.' });
    if (!inventory) return res.status(404).json({ error: 'Inventory item was not found.' });
    if (inventory.status !== 'AVAILABLE') return res.status(409).json({ error: 'This inventory item is not available.' });

    const request = await InventoryRequest.create({
      id: id('IRQ'),
      inventoryId: inventory.id,
      volunteerId: volunteer.id,
      ngoId: inventory.ngoId,
      destination: req.body.destination.trim(),
      peopleTarget: Number(req.body.peopleTarget || inventory.mealCount),
      status: 'PENDING_NGO',
      createdAt: now()
    });

    inventory.status = 'REQUESTED';
    await inventory.save();

    await addEvent('INVENTORY_REQUESTED', `${volunteer.name} requested NGO stock for ${request.destination}.`);
    res.status(201).json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/inventory-requests/:requestId/approve', async (req, res, next) => {
  try {
    const request = await InventoryRequest.findOne({ id: req.params.requestId });
    if (!request) return res.status(404).json({ error: 'Inventory request was not found.' });
    if (request.status !== 'PENDING_NGO') return res.status(409).json({ error: 'Request is not pending approval.' });

    const inventory = await Inventory.findOne({ id: request.inventoryId });
    const volunteer = await Volunteer.findOne({ id: request.volunteerId });
    const ngo = await Ngo.findOne({ id: request.ngoId });
    if (!inventory || !volunteer || !ngo) return res.status(404).json({ error: 'Related workflow record is missing.' });

    request.status = 'APPROVED';
    request.approvedAt = now();
    await request.save();

    inventory.status = 'ASSIGNED';
    await inventory.save();

    await InventoryAssignment.create({
      id: id('IASN'),
      requestId: request.id,
      inventoryId: inventory.id,
      volunteerId: volunteer.id,
      ngoId: ngo.id,
      destination: request.destination,
      peopleTarget: request.peopleTarget,
      status: 'APPROVED_FOR_PICKUP',
      peopleServed: 0,
      notes: '',
      createdAt: now()
    });

    await addEvent('INVENTORY_APPROVED', `${ngo.name} approved ${volunteer.name} to distribute ${inventory.foodName}.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/inventory-assignments/:assignmentId/pick-up', async (req, res, next) => {
  try {
    const assignment = await InventoryAssignment.findOne({ id: req.params.assignmentId });
    if (!assignment) return res.status(404).json({ error: 'Inventory assignment was not found.' });
    if (assignment.status !== 'APPROVED_FOR_PICKUP') {
      return res.status(409).json({ error: 'Assignment is not ready for pickup.' });
    }

    const inventory = await Inventory.findOne({ id: assignment.inventoryId });
    assignment.status = 'IN_TRANSIT';
    assignment.pickedUpAt = now();
    await assignment.save();

    if (inventory) {
      inventory.status = 'IN_TRANSIT';
      await inventory.save();
    }

    await addEvent('INVENTORY_PICKED_UP', `${inventory?.foodName || 'NGO stock'} left the NGO for distribution.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/inventory-assignments/:assignmentId/complete', async (req, res, next) => {
  try {
    const assignment = await InventoryAssignment.findOne({ id: req.params.assignmentId });
    if (!assignment) return res.status(404).json({ error: 'Inventory assignment was not found.' });
    if (assignment.status !== 'IN_TRANSIT') {
      return res.status(409).json({ error: 'Inventory assignment must be picked up before completion.' });
    }

    const inventory = await Inventory.findOne({ id: assignment.inventoryId });
    assignment.status = 'COMPLETED';
    assignment.peopleServed = Number(req.body.peopleServed || assignment.peopleTarget || inventory?.mealCount || 0);
    assignment.notes = req.body.notes?.trim() || '';
    assignment.completedAt = now();
    await assignment.save();

    if (inventory) {
      inventory.status = 'DISTRIBUTED';
      await inventory.save();
    }

    await addEvent('INVENTORY_DISTRIBUTED', `${inventory?.foodName || 'NGO stock'} was distributed at ${assignment.destination}.`);
    res.json(await publicState());
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ error: error.message || 'Unexpected server error.' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API server running with MongoDB on http://127.0.0.1:${PORT}`);
  });
});
