import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

class GHLService {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    this.companyId = process.env.GHL_COMPANY_ID;
    
    this.client = axios.create({
      baseURL: GHL_API_BASE,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
  }

  // Get all users/staff in the location
  async getUsers() {
    try {
      const response = await this.client.get(`/users/`, {
        params: {
          locationId: this.locationId
        }
      });
      
      return response.data.users || response.data;
    } catch (error) {
      console.error('Error fetching GHL users:', error.response?.data || error.message);
      throw new Error(`Failed to fetch GHL users: ${error.message}`);
    }
  }

  // Get phone numbers in GHL (LC Phone System)
  async getPhoneNumbers() {
    try {
      const response = await this.client.get(
        `/phone-system/numbers/location/${this.locationId}`
      );

      console.log('GHL phone numbers raw:', response.data);

      const data = response.data;
      return data.numbers || data.phoneNumbers || data.data || data;
    } catch (error) {
      console.error(
        'Error fetching GHL phone numbers:',
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to fetch GHL phone numbers: ${
          error.response?.data?.message || error.message
        }`
      );
    }
  }

  // Add/Update phone number in GHL
  async addPhoneNumber(phoneNumber, name = null) {
    try {
      const response = await this.client.post(`/locations/${this.locationId}/phone-numbers`, {
        phoneNumber: phoneNumber,
        name: name || phoneNumber
      });
      
      return response.data;
    } catch (error) {
      console.error('Error adding phone number to GHL:', error.response?.data || error.message);
      throw new Error(`Failed to add phone number to GHL: ${error.message}`);
    }
  }

  // Delete phone number from GHL
  async deletePhoneNumber(phoneNumberId) {
    try {
      await this.client.delete(`/locations/${this.locationId}/phone-numbers/${phoneNumberId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting phone number from GHL:', error.response?.data || error.message);
      throw new Error(`Failed to delete phone number from GHL: ${error.message}`);
    }
  }

  // Get user details
  async getUser(userId) {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching GHL user:', error.response?.data || error.message);
      throw new Error(`Failed to fetch GHL user: ${error.message}`);
    }
  }

  // Get user by email
  async getUserByEmail(email) {
    try {
      console.log(`[GHL Service] Searching for user by email: ${email}`);
      const users = await this.getUsers();

      const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (user) {
        console.log(`[GHL Service] ✅ Found user: ${user.id}`);
        return user;
      }

      console.log(`[GHL Service] User not found: ${email}`);
      return null;
    } catch (error) {
      console.error('[GHL Service] Error finding user by email:', error.message);
      return null;
    }
  }

  // Create a new user in GHL (sends invitation email automatically)
  async createUser(firstName, lastName, email, role = 'user') {
    try {
      console.log(`[GHL Service] Creating user: ${email}`);

      const userData = {
        companyId: this.companyId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        type: 'account',
        role: role,
        locationIds: [this.locationId],
        permissions: {
          campaignsEnabled: true,
          campaignsReadOnly: false,
          contactsEnabled: true,
          dashboardStatsEnabled: true,
          bulkRequestsEnabled: true,
          appointmentsEnabled: true,
          reviewsEnabled: true,
          onlineListingsEnabled: true,
          phoneCallEnabled: true,
          conversationsEnabled: true,
          opportunitiesEnabled: true,
          paymentsEnabled: false,
          triggersEnabled: false,
          funnelsEnabled: false,
          websitesEnabled: false,
          contentAiEnabled: false,
          attributionsEnabled: true,
          settingsEnabled: false,
          tagsEnabled: true,
          leadValueEnabled: true,
          marketingEnabled: true,
          agentReportingEnabled: true,
          botService: false,
          socialPlanner: false,
          bloggingEnabled: false,
          invoiceEnabled: false,
          affiliateManagerEnabled: false,
          contentAiEditingEnabled: false,
          recordPaymentEnabled: false,
          cancelSubscriptionEnabled: false,
          emailsEnabled: true
        }
      };

      console.log(`[GHL Service] Sending request to /users/ with locationId: ${this.locationId}`);

      const response = await this.client.post('/users/', userData);

      console.log(`[GHL Service] ✅ User created: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        userId: response.data.id || response.data.userId,
        email: email,
        firstName: firstName,
        lastName: lastName
      };
    } catch (error) {
      console.error('[GHL Service] Error creating user:', error.response?.data || error.message);
      throw new Error(`Failed to create GHL user: ${error.response?.data?.message || error.message}`);
    }
  }

  // Delete/remove a user from GHL
  async deleteUser(userId) {
    try {
      console.log(`[GHL Service] Attempting to delete user: ${userId}`);
      
      const response = await this.client.delete(`/users/${userId}`);

      console.log(`[GHL Service] ✅ User ${userId} deleted successfully`);
      return response.data || { success: true, userId, message: 'User deleted successfully' };
      
    } catch (error) {
      console.error('[GHL Service] Delete user error:', error.response?.data || error.message);
      throw new Error(`Failed to delete GHL user: ${error.message}`);
    }
  }

  // Assign phone number to user in GHL
  async assignNumberToUser(phoneNumber, userId, userName = null) {
    try {
      console.log(`[GHL Service] Assigning ${phoneNumber} to user ${userId}`);
      
      // First, add the phone number to GHL location if not already there
      try {
        await this.addPhoneNumber(phoneNumber, userName || phoneNumber);
        console.log(`[GHL Service] Phone number added to location`);
      } catch (error) {
        // Number might already exist, that's okay
        console.log(`[GHL Service] Phone number may already exist in location: ${error.message}`);
      }
      
      // Get all phone numbers in GHL to find the one we just added
      const ghlNumbers = await this.getPhoneNumbers();
      const ghlNumber = ghlNumbers.find(n => 
        this.normalizePhone(n.phoneNumber || n.number) === this.normalizePhone(phoneNumber)
      );
      
      if (!ghlNumber) {
        throw new Error('Phone number not found in GHL after adding');
      }
      
      // Update the phone number to assign it to the user
      // GHL uses the linkedUser field to assign numbers to users
      const phoneNumberId = ghlNumber.id || ghlNumber._id;
      
      await this.client.put(
        `/phone-system/numbers/${phoneNumberId}`,
        {
          linkedUser: userId,
          name: userName || phoneNumber
        }
      );
      
      console.log(`[GHL Service] ✅ Phone number assigned to user ${userId}`);
      
      return { 
        success: true,
        phoneNumber,
        userId,
        phoneNumberId
      };
    } catch (error) {
      console.error('[GHL Service] Error assigning phone number:', error.response?.data || error.message);
      throw new Error(`Failed to assign phone number in GHL: ${error.response?.data?.message || error.message}`);
    }
  }

  // Add method to compare Twilio vs GHL numbers
  async compareWithTwilio(twilioNumbers) {
    try {
      const ghlNumbers = await this.getPhoneNumbers();
      
      // Extract phone numbers from GHL (format might vary)
      const ghlNumberSet = new Set(
        ghlNumbers.map(n => this.normalizePhone(n.phoneNumber || n.number))
      );
      
      // Compare and return enriched data
      return twilioNumbers.map(twilioNum => ({
        ...twilioNum,
        inGHL: ghlNumberSet.has(this.normalizePhone(twilioNum.phoneNumber)),
        ghlData: ghlNumbers.find(g => 
          this.normalizePhone(g.phoneNumber || g.number) === 
          this.normalizePhone(twilioNum.phoneNumber)
        )
      }));
    } catch (error) {
      console.error('Error comparing numbers:', error);
      throw error;
    }
  }

  normalizePhone(phone) {
    // Remove all non-digits
    return phone.replace(/\D/g, '');
  }

  // Get opportunities (booked appointments) from GHL
  async getOpportunities(startDate = null, endDate = null) {
    try {
      const params = {
        location_id: this.locationId,
        limit: 100
      };

      if (startDate) {
        params.startAfter = new Date(startDate).getTime();
      }
      if (endDate) {
        params.endBefore = new Date(endDate).getTime();
      }

      const response = await this.client.get(`/opportunities/search`, { params });
      
      console.log('[GHL] Fetched opportunities:', response.data);
      return response.data.opportunities || response.data.data || [];
    } catch (error) {
      console.error('[GHL] Error fetching opportunities:', error.response?.data || error.message);
      return [];
    }
  }
}

export default new GHLService();