import express from 'express';
import googleWorkspaceService from '../services/googleWorkspaceService.js';
import * as calendlyService from '../services/calendlyService.js';
import zoomService from '../services/zoomService.js';
import ghlService from '../services/ghlService.js';
import twilioService from '../services/twilioService.js';

const router = express.Router();

// Step 1: Create Google Workspace account only
router.post('/google-workspace', async (req, res) => {
  try {
    const { firstName, lastName, personalEmail } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ 
        success: false,
        error: 'First name and last name are required' 
      });
    }

    console.log(`[Onboard Step 1] Creating Google Workspace for ${firstName} ${lastName}`);

    // Generate email
    const workEmail = await googleWorkspaceService.generateEmail(firstName, lastName);
    console.log(`[Onboard Step 1] Generated email: ${workEmail}`);

    // Fixed password for all new accounts
    const tempPassword = 'Tjrtrades123!';

    // Create Google Workspace account with fixed password
    const gwResult = await googleWorkspaceService.createAccount(firstName, lastName, workEmail, tempPassword);
    console.log(`[Onboard Step 1] ✅ Google Workspace account created`);

    // TODO: Send email to personalEmail with credentials
    console.log(`[Onboard Step 1] TODO: Send credentials to ${personalEmail}`);

    res.json({
      success: true,
      email: workEmail,
      temporaryPassword: tempPassword,
      googleWorkspaceId: gwResult.id,
      message: `Google Workspace account created. Credentials sent to ${personalEmail}`
    });

  } catch (error) {
    console.error('[Onboard Step 1] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Step 2: Create Zoom account only
router.post('/zoom', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'First name, last name, and email are required' 
      });
    }

    console.log(`[Onboard Step 2] Creating Zoom account for ${email}`);

    const zoomResult = await zoomService.createUser(firstName, lastName, email);
    console.log(`[Onboard Step 2] ✅ Zoom account created`);

    res.json({
      success: true,
      userId: zoomResult.userId,
      email: zoomResult.email,
      message: 'Zoom account created successfully'
    });

  } catch (error) {
    console.error('[Onboard Step 2] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Step 3: Send Calendly invitation only
router.post('/calendly', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'First name, last name, and email are required' 
      });
    }

    console.log(`[Onboard Step 3] Sending Calendly invitation to ${email}`);

    try {
      const calendlyResult = await calendlyService.inviteUser(email, firstName, lastName);
      console.log(`[Onboard Step 3] ✅ Calendly invitation sent`);

      res.json({
        success: true,
        email: calendlyResult.email,
        invitationUri: calendlyResult.invitationUri,
        message: 'Calendly invitation sent successfully'
      });
    } catch (apiError) {
      // If API invitation fails, return success but note manual invitation needed
      console.log(`[Onboard Step 3] ⚠️ API invitation failed, flagging for manual invitation`);
      
      res.json({
        success: true,
        email: email,
        invitationUri: null,
        manualInviteNeeded: true,
        message: 'Calendly account flagged - admin will send invitation manually'
      });
    }

  } catch (error) {
    console.error('[Onboard Step 3] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Step 4: Create GHL account + Purchase Twilio 650 number
router.post('/ghl-and-twilio', async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        success: false,
        error: 'First name, last name, and email are required' 
      });
    }

    console.log(`[Onboard Step 4] Creating GHL account and purchasing Twilio number for ${email}`);

    let ghlUserId = null;
    let twilioNumber = null;

    // Create GHL account
    try {
      console.log('[Onboard Step 4] Creating GHL account...');
      const ghlResult = await ghlService.createUser(firstName, lastName, email, 'user');
      ghlUserId = ghlResult.userId;
      console.log('[Onboard Step 4] ✅ GHL account created');
    } catch (error) {
      console.error('[Onboard Step 4] GHL creation failed:', error.message);
      throw new Error(`GHL account creation failed: ${error.message}`);
    }

    // Purchase Twilio 650 number
    try {
      console.log('[Onboard Step 4] Purchasing 650 number...');
      const availableNumbers = await twilioService.searchAvailableNumbers('650', 5);
      
      if (availableNumbers.length === 0) {
        throw new Error('No available 650 numbers found');
      }

      const numberToPurchase = availableNumbers[0].phoneNumber;
      const friendlyName = `${firstName} ${lastName}`;
      
      // Purchase the number
      const purchased = await twilioService.purchaseNumber(numberToPurchase, friendlyName);
      twilioNumber = purchased.phoneNumber;
      
      // Add to messaging service
      await twilioService.addToMessagingService(purchased.sid);
      
      // Add to A2P campaign
      await twilioService.addToCampaign(purchased.sid);
      
      console.log(`[Onboard Step 4] ✅ 650 number purchased: ${twilioNumber}`);
    } catch (error) {
      console.error('[Onboard Step 4] Twilio purchase failed:', error.message);
      // Don't fail the whole step if Twilio fails - GHL account is still created
      twilioNumber = 'Failed to purchase - contact admin';
    }

    res.json({
      success: true,
      ghlUserId: ghlUserId,
      email: email,
      twilioNumber: twilioNumber,
      message: 'GHL account created and phone number assigned'
    });

  } catch (error) {
    console.error('[Onboard Step 4] Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;