import express from 'express';
import twilioService from '../services/twilioService.js';
import stateService from '../services/stateService.js';
import ghlService from '../services/ghlService.js';

const router = express.Router();

// Get all area codes
router.get('/area-codes', (req, res) => {
  try {
    const areaCodes = twilioService.getAreaCodes();
    res.json({ success: true, areaCodes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search available numbers by area code
router.get('/search', async (req, res) => {
  try {
    const { areaCode, limit = 20 } = req.query;

    if (!areaCode) {
      return res.status(400).json({ error: 'Area code is required' });
    }

    const numbers = await twilioService.searchAvailableNumbers(areaCode, parseInt(limit));
    res.json({ success: true, numbers, count: numbers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all purchased numbers
router.get('/', async (req, res) => {
  try {
    const numbers = await twilioService.getAllNumbers();
    res.json({ success: true, numbers, count: numbers.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase a new number
router.post('/purchase', async (req, res) => {
  try {
    const { phoneNumber, friendlyName, areaCode } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    console.log(`Purchasing number: ${phoneNumber}`);
    const purchased = await twilioService.purchaseNumber(phoneNumber, friendlyName);

    console.log(`Adding to messaging service...`);
    await twilioService.addToMessagingService(purchased.sid);

    console.log(`✅ Number purchased successfully: ${phoneNumber}`);
    res.json({ 
      success: true, 
      message: 'Number purchased successfully',
      number: purchased 
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to purchase number. Check if number is still available.'
    });
  }
});

// Update number (friendly name, etc)
router.put('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    const { friendlyName } = req.body;

    if (!friendlyName) {
      return res.status(400).json({ error: 'Friendly name is required' });
    }

    await twilioService.updateNumber(sid, { friendlyName });

    res.json({ success: true, message: 'Number updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Release/delete a number
router.delete('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;

    await twilioService.releaseNumber(sid);

    res.json({ 
      success: true, 
      message: 'Number released successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick purchase for Setters (510) or Closers (650)
router.post('/purchase-quick', async (req, res) => {
  try {
    const { areaCode, friendlyName } = req.body;
    
    if (!areaCode) {
      return res.status(400).json({ error: 'Area code is required (510 or 650)' });
    }

    console.log(`[Quick Purchase] Searching for ${areaCode} number...`);
    
    // Search for available numbers in this area code
    const availableNumbers = await twilioService.searchAvailableNumbers(areaCode, 5);
    
    if (availableNumbers.length === 0) {
      return res.status(404).json({ 
        error: `No available numbers found in area code ${areaCode}`,
        areaCode 
      });
    }

    // Purchase the first available number
    const numberToPurchase = availableNumbers[0].phoneNumber;
    const name = friendlyName || `${areaCode === '510' ? 'Setter' : 'Closer'} ${numberToPurchase}`;
    
    console.log(`[Quick Purchase] Purchasing: ${numberToPurchase}`);
    const purchased = await twilioService.purchaseNumber(numberToPurchase, name);

    console.log(`[Quick Purchase] Adding to messaging service...`);
    await twilioService.addToMessagingService(purchased.sid);

    console.log(`[Quick Purchase] ✅ Success: ${numberToPurchase}`);
    
    res.json({ 
      success: true, 
      message: `Successfully purchased ${areaCode} number`,
      number: purchased,
      areaCode
    });

  } catch (error) {
    console.error('[Quick Purchase] Error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to purchase number. Please try again.'
    });
  }
});

// Bulk purchase setter numbers for multiple GHL users
// POST /api/numbers/setters/bulk-purchase
// Body: { users: [{ userId: 'xxx', name: 'John Doe' }, ...] }
router.post('/setters/bulk-purchase', async (req, res) => {
  try {
    const { users } = req.body; // Array of { userId, name }
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ 
        error: 'Users array is required',
        example: { users: [{ userId: '123', name: 'John Doe' }] }
      });
    }

    console.log(`[Setter Bulk Purchase] Purchasing ${users.length} setter numbers...`);
    
    const results = {
      purchased: [],
      failed: []
    };

    // Purchase numbers sequentially to avoid rate limits
    for (const user of users) {
      try {
        console.log(`[Setter Bulk Purchase] Processing: ${user.name}`);
        
        // Search for available 510 numbers
        const availableNumbers = await twilioService.searchAvailableNumbers('510', 5);
        
        if (availableNumbers.length === 0) {
          results.failed.push({
            user: user.name,
            error: 'No available 510 numbers found'
          });
          continue;
        }

        // Purchase the first available number
        const numberToPurchase = availableNumbers[0].phoneNumber;
        const friendlyName = user.name; // Use GHL user's name
        
        console.log(`[Setter Bulk Purchase] Purchasing ${numberToPurchase} for ${user.name}`);
        const purchased = await twilioService.purchaseNumber(numberToPurchase, friendlyName);

        // Add to messaging service (A2P campaign)
        console.log(`[Setter Bulk Purchase] Adding to A2P campaign...`);
        await twilioService.addToMessagingService(purchased.sid);

        results.purchased.push({
          user: user.name,
          userId: user.userId,
          phoneNumber: purchased.phoneNumber,
          sid: purchased.sid,
          friendlyName: purchased.friendlyName
        });

        console.log(`[Setter Bulk Purchase] ✅ Success: ${numberToPurchase} → ${user.name}`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[Setter Bulk Purchase] Error for ${user.name}:`, error.message);
        results.failed.push({
          user: user.name,
          error: error.message
        });
      }
    }

    console.log(`[Setter Bulk Purchase] Complete: ${results.purchased.length} succeeded, ${results.failed.length} failed`);

    res.json({
      success: true,
      message: `Bulk purchase complete: ${results.purchased.length} succeeded, ${results.failed.length} failed`,
      summary: {
        total: users.length,
        purchased: results.purchased.length,
        failed: results.failed.length
      },
      results
    });

  } catch (error) {
    console.error('[Setter Bulk Purchase] Error:', error);
    res.status(500).json({
      error: error.message,
      details: 'Failed to complete bulk purchase'
    });
  }
});

// Release/delete a number
router.delete('/:sid', async (req, res) => {
  try {
    const { sid } = req.params;

    await twilioService.releaseNumber(sid);

    res.json({ 
      success: true, 
      message: 'Number released successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all numbers WITH GHL sync status
router.get('/with-ghl-status', async (req, res) => {
  try {
    console.log('Fetching numbers with GHL sync status...');
    
    // Get all Twilio numbers
    const twilioNumbers = await twilioService.getAllNumbers();
    console.log(`Found ${twilioNumbers.length} Twilio numbers`);
    
    // Compare with GHL
    const numbersWithStatus = await ghlService.compareWithTwilio(twilioNumbers);
    
    // Calculate summary
    const summary = {
      total: numbersWithStatus.length,
      inGHL: numbersWithStatus.filter(n => n.inGHL).length,
      notInGHL: numbersWithStatus.filter(n => !n.inGHL).length
    };
    
    console.log('Summary:', summary);
    
    res.json({
      success: true,
      numbers: numbersWithStatus,
      summary
    });
  } catch (error) {
    console.error('Error fetching numbers with GHL status:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to fetch GHL sync status. Check GHL API credentials.'
    });
  }
});

// ==================== NEW STATE-BASED ROUTES ====================

// Get all US states
router.get('/states', (req, res) => {
  try {
    const states = stateService.getAllStates();
    res.json({ success: true, states, count: states.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search available number for specific state(s)
router.post('/states/search', async (req, res) => {
  try {
    const { states } = req.body; // Array of state names

    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({ error: 'States array is required' });
    }

    console.log(`Searching numbers for ${states.length} states:`, states);
    const results = await stateService.searchNumbersForStates(states);

    res.json({ 
      success: true, 
      results,
      summary: {
        total: states.length,
        found: results.success.length,
        failed: results.failed.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk purchase numbers by state
router.post('/states/purchase', async (req, res) => {
  try {
    const { states } = req.body; // Array of state names

    if (!states || !Array.isArray(states) || states.length === 0) {
      return res.status(400).json({ error: 'States array is required' });
    }

    console.log(`Bulk purchasing numbers for ${states.length} states:`, states);

    // Step 1: Search for available numbers
    const searchResults = await stateService.searchNumbersForStates(states);

    if (searchResults.success.length === 0) {
      return res.status(404).json({ 
        error: 'No available numbers found for any requested state',
        failed: searchResults.failed
      });
    }

    // Step 2: Purchase each found number
    const purchaseResults = {
      success: [],
      failed: []
    };

    for (const result of searchResults.success) {
      try {
        const { state, number } = result;
        
        // Purchase from Twilio with state name as friendly name
        console.log(`Purchasing ${number.phoneNumber} for ${state}`);
        const purchased = await twilioService.purchaseNumber(
          number.phoneNumber, 
          state // Use state name as friendly name
        );

        // Add to messaging service
        await twilioService.addToMessagingService(purchased.sid);

        purchaseResults.success.push({
          state,
          phoneNumber: purchased.phoneNumber,
          friendlyName: purchased.friendlyName,
          twilioSid: purchased.sid
        });

      } catch (error) {
        console.error(`Failed to purchase for ${result.state}:`, error.message);
        purchaseResults.failed.push({
          state: result.state,
          phoneNumber: result.number.phoneNumber,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Purchased ${purchaseResults.success.length} numbers`,
      results: purchaseResults,
      summary: {
        requested: states.length,
        purchased: purchaseResults.success.length,
        failed: purchaseResults.failed.length + searchResults.failed.length
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk release numbers
router.post('/bulk-release', async (req, res) => {
  try {
    const { phoneNumbers } = req.body; // Array of phone numbers (strings)

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return res.status(400).json({ error: 'phoneNumbers array is required' });
    }

    console.log(`Bulk releasing ${phoneNumbers.length} numbers`);

    const results = {
      success: [],
      failed: []
    };

    // Get all Twilio numbers to find their SIDs
    const twilioNumbers = await twilioService.getAllNumbers();

    for (const phoneNumber of phoneNumbers) {
      try {
        // Find the SID for this phone number
        const twilioNumber = twilioNumbers.find(n => n.phoneNumber === phoneNumber);
        
        if (!twilioNumber) {
          results.failed.push({
            phoneNumber,
            error: 'Number not found in Twilio account'
          });
          continue;
        }

        // Release the number
        await twilioService.releaseNumber(twilioNumber.sid);
        
        results.success.push({
          phoneNumber,
          twilioSid: twilioNumber.sid
        });

      } catch (error) {
        console.error(`Failed to release ${phoneNumber}:`, error.message);
        results.failed.push({
          phoneNumber,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Released ${results.success.length} numbers`,
      results,
      summary: {
        requested: phoneNumbers.length,
        released: results.success.length,
        failed: results.failed.length
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;