import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

class GHLService {
  constructor() {
    this.apiKey = process.env.GHL_API_KEY;
    this.locationId = process.env.GHL_LOCATION_ID;
    
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

  // Assign phone number to user (this might need to be done through GHL UI or different endpoint)
  async assignNumberToUser(phoneNumber, userId) {
    console.log(`Assignment requested: ${phoneNumber} to ${userId}`);
    return { 
      message: 'Assignment tracking in local DB. Manual assignment in GHL UI may be required.',
      phoneNumber,
      userId 
    };
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