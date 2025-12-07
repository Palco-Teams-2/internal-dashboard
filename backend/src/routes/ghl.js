import express from 'express';

import { PrismaClient } from '@prisma/client';
import ghlService from '../services/ghlService.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/ghl/users
// Fetch fresh users from GHL API, sync to DB, then return from DB (with createdAt timestamps)
router.get('/users', async (req, res) => {
  try {
    // Always fetch fresh data from GHL API
    const apiUsers = await ghlService.getUsers();
    
    // Sync all users to database (add new ones, update existing)
    for (const user of apiUsers) {
      const ghlUserId = user.id || user.userId || user._id;
      if (!ghlUserId) continue;

      const name =
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Unknown';

      const existing = await prisma.gHLUser.findUnique({
        where: { ghlUserId },
      });

      if (existing) {
        // Update existing user
        await prisma.gHLUser.update({
          where: { ghlUserId },
          data: {
            name,
            email: user.email || null,
            role: user.role || null,
            lastSyncedAt: new Date(),
          },
        });
      } else {
        // Create new user (createdAt will be set automatically)
        await prisma.gHLUser.create({
          data: {
            ghlUserId,
            name,
            email: user.email || null,
            role: user.role || null,
            assignedNumbers: null,
            lastSyncedAt: new Date(),
          },
        });
      }
    }
    
    // Return users from DB (with createdAt and updatedAt timestamps)
    const dbUsers = await prisma.gHLUser.findMany({
      orderBy: { createdAt: 'desc' }, // Newest first
    });
    
    return res.json({ success: true, users: dbUsers, source: 'db-synced' });
  } catch (error) {
    console.error('GET /api/ghl/users error:', error);
    
    // Fallback to DB if GHL API fails
    try {
      const dbUsers = await prisma.gHLUser.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      if (dbUsers.length > 0) {
        console.log('⚠️ Using cached users from DB (GHL API failed)');
        return res.json({ success: true, users: dbUsers, source: 'db-fallback' });
      }
    } catch (dbError) {
      console.error('DB fallback also failed:', dbError);
    }
    
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ghl/sync/users
// Fetch users from GHL API and upsert into Prisma GHLUser table
router.post('/sync/users', async (req, res) => {
  try {
    const apiUsers = await ghlService.getUsers();
    let added = 0;
    let updated = 0;

    for (const user of apiUsers) {
      // GHL user objects often look like: { id, firstName, lastName, email, role, ... }
      const ghlUserId = user.id || user.userId || user._id;
      if (!ghlUserId) continue;

      const name =
        user.name ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Unknown';

      const existing = await prisma.gHLUser.findUnique({
        where: { ghlUserId },
      });

      if (existing) {
        await prisma.gHLUser.update({
          where: { ghlUserId },
          data: {
            name,
            email: user.email || null,
            role: user.role || null,
            lastSyncedAt: new Date(),
          },
        });
        updated++;
      } else {
        await prisma.gHLUser.create({
          data: {
            ghlUserId,
            name,
            email: user.email || null,
            role: user.role || null,
            assignedNumbers: null, // we store assigned numbers later if needed
            lastSyncedAt: new Date(),
          },
        });
        added++;
      }
    }

    res.json({
      success: true,
      message: 'GHL users synced successfully',
      totals: {
        fromApi: apiUsers.length,
        added,
        updated,
      },
    });
  } catch (error) {
    console.error('POST /api/ghl/sync/users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// (Optional for later) - expose raw GHL phone numbers
router.get('/phone-numbers', async (req, res) => {
  try {
    const numbers = await ghlService.getPhoneNumbers();
    res.json({ success: true, numbers });
  } catch (error) {
    console.error('GET /api/ghl/phone-numbers error:', error);

    // Fallback: return mock data so UI still works
    const mockNumbers = [
      {
        phoneNumber: '+12025550123',
        friendlyName: 'GHL Mock Number 1',
        assignedUserName: 'Demo Staff 1',
      },
      {
        phoneNumber: '+13055550123',
        friendlyName: 'GHL Mock Number 2',
        assignedUserName: 'Demo Staff 2',
      },
    ];

    res.json({
      success: false,
      error: error.message,
      numbers: mockNumbers,
      source: 'mock-fallback',
    });
  }
});

// DEBUG endpoint to see full GHL data structure
router.get('/phone-numbers/debug', async (req, res) => {
  try {
    const numbers = await ghlService.getPhoneNumbers();
    // Return first number with full details to inspect structure
    res.json({ 
      success: true, 
      totalNumbers: numbers.length,
      sampleNumber: numbers[0], // Full data structure of first number
      allNumbers: numbers // All numbers with full details
    });
  } catch (error) {
    console.error('GET /api/ghl/phone-numbers/debug error:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;