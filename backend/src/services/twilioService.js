import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Create Twilio client
const client = twilio(accountSid, authToken);

// ========================================
// IN-MEMORY CACHE FOR PERFORMANCE
// Cache setter performance data for 3 minutes
// ========================================
const performanceCache = {
  data: {},
  timestamps: {},
  CACHE_DURATION: 3 * 60 * 1000 // 3 minutes in milliseconds
};

class TwilioService {
  // Get area codes (static list - you already have this in stateService)
  getAreaCodes() {
    return [
      { code: '202', region: 'Washington', state: 'DC' },
      { code: '305', region: 'Miami', state: 'FL' },
      { code: '415', region: 'San Francisco', state: 'CA' },
      { code: '646', region: 'New York', state: 'NY' },
    ];
  }

  // Search for available phone numbers by area code
  async searchAvailableNumbers(areaCode, limit = 20) {
    try {
      console.log(`[Twilio] Searching for ${limit} numbers in area code ${areaCode}`);
      
      const numbers = await client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: areaCode,
          limit: limit,
          smsEnabled: true,
          voiceEnabled: true
        });

      return numbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        locality: number.locality,
        region: number.region,
        postalCode: number.postalCode,
        capabilities: number.capabilities
      }));
    } catch (error) {
      console.error('[Twilio] Error searching numbers:', error.message);
      throw new Error(`Failed to search numbers: ${error.message}`);
    }
  }

  // Purchase a phone number
  async purchaseNumber(phoneNumber, friendlyName = null) {
    try {
      console.log(`[Twilio] Purchasing number: ${phoneNumber}`);
      
      const purchasedNumber = await client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        friendlyName: friendlyName || phoneNumber,
        smsUrl: 'http://demo.twilio.com/docs/sms.xml',
        voiceUrl: 'http://demo.twilio.com/docs/voice.xml'
      });

      console.log(`[Twilio] ✅ Purchased: ${purchasedNumber.phoneNumber} (${purchasedNumber.sid})`);

      return {
        sid: purchasedNumber.sid,
        phoneNumber: purchasedNumber.phoneNumber,
        friendlyName: purchasedNumber.friendlyName,
        dateCreated: purchasedNumber.dateCreated
      };
    } catch (error) {
      console.error('[Twilio] Error purchasing number:', error.message);
      throw new Error(`Failed to purchase number: ${error.message}`);
    }
  }

  // Add phone number to messaging service using HTTP API
  async addToMessagingService(phoneNumberSid) {
    try {
      if (!messagingServiceSid) {
        console.warn('[Twilio] No messaging service SID configured, skipping...');
        return { success: false, error: 'Messaging Service SID not configured' };
      }

      console.log(`[Twilio] Adding ${phoneNumberSid} to messaging service ${messagingServiceSid}`);

      const url = `https://messaging.twilio.com/v1/Services/${messagingServiceSid}/PhoneNumbers`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          PhoneNumberSid: phoneNumberSid
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Twilio] API Response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log(`[Twilio] ✅ Added to messaging service (${data.sid})`);
      return { success: true };
    } catch (error) {
      console.error('[Twilio] Error adding to messaging service:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Update phone number (friendly name, etc)
  async updateNumber(phoneNumberSid, updates) {
    try {
      console.log(`[Twilio] Updating number ${phoneNumberSid}`);
      
      const updatedNumber = await client.incomingPhoneNumbers(phoneNumberSid)
        .update(updates);

      return {
        sid: updatedNumber.sid,
        phoneNumber: updatedNumber.phoneNumber,
        friendlyName: updatedNumber.friendlyName
      };
    } catch (error) {
      console.error('[Twilio] Error updating number:', error.message);
      throw new Error(`Failed to update number: ${error.message}`);
    }
  }

  // Release/delete a phone number
  async releaseNumber(phoneNumberSid) {
    try {
      console.log(`[Twilio] Releasing number ${phoneNumberSid}`);
      
      await client.incomingPhoneNumbers(phoneNumberSid).remove();
      
      console.log(`[Twilio] ✅ Number released`);
      return { success: true };
    } catch (error) {
      console.error('[Twilio] Error releasing number:', error.message);
      throw new Error(`Failed to release number: ${error.message}`);
    }
  }

  // Get all purchased numbers from Twilio
  async getAllNumbers() {
    try {
      console.log('[Twilio] Fetching all numbers from account');
      
      const numbers = await client.incomingPhoneNumbers.list();
      
      console.log(`[Twilio] Found ${numbers.length} numbers`);

      return numbers.map(number => ({
        sid: number.sid,
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        dateCreated: number.dateCreated,
        capabilities: number.capabilities
      }));
    } catch (error) {
      console.error('[Twilio] Error fetching numbers:', error.message);
      throw new Error(`Failed to fetch numbers: ${error.message}`);
    }
  }

  // Get call logs for analytics - ENHANCED
  async getCallLogs(options = {}) {
    try {
      const {
        phoneNumber = null,
        startDate = null,
        endDate = null,
        limit = 20000, // Increased default limit
        status = null
      } = options;

      console.log(`[Twilio] Fetching call logs`, options);
      
      const queryOptions = {
        limit: limit,
        pageSize: 1000 // Increased batch size for faster fetching
      };

      // Filter by phone number (FROM field for outbound calls)
      if (phoneNumber) {
        queryOptions.from = phoneNumber;
      }

      // Note: Not filtering by direction to capture all types of outbound calls
      // (outbound-api, outbound-dial, etc.)

      // Date filters
      if (startDate) {
        queryOptions.startTimeAfter = new Date(startDate);
      }
      if (endDate) {
        queryOptions.startTimeBefore = new Date(endDate);
      }

      // Status filter (completed, failed, busy, no-answer)
      if (status) {
        queryOptions.status = status;
      }

      const calls = await client.calls.list(queryOptions);

      console.log(`[Twilio] Found ${calls.length} call records`);

      return calls.map(call => ({
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: parseInt(call.duration) || 0,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        answeredBy: call.answeredBy,
        price: call.price,
        priceUnit: call.priceUnit,
        phoneNumberSid: call.phoneNumberSid
      }));
    } catch (error) {
      console.error('[Twilio] Error fetching call logs:', error.message);
      throw new Error(`Failed to fetch call logs: ${error.message}`);
    }
  }

  // Get call statistics for a specific number
  async getNumberCallStats(phoneNumber, days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const calls = await this.getCallLogs({
        phoneNumber,
        startDate: startDate.toISOString()
      });

      // Calculate statistics
      const totalCalls = calls.length;
      const completedCalls = calls.filter(c => c.status === 'completed' && c.duration > 0).length;
      const noAnswerCalls = calls.filter(c => c.status === 'no-answer').length;
      const failedCalls = calls.filter(c => c.status === 'failed' || c.status === 'busy').length;
      const canceledCalls = calls.filter(c => c.status === 'canceled').length;

      const answeredCalls = calls.filter(c => c.status === 'completed' && c.duration > 0);
      const avgDuration = answeredCalls.length > 0
        ? Math.round(answeredCalls.reduce((sum, c) => sum + c.duration, 0) / answeredCalls.length)
        : 0;

      const answerRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

      // Spam risk assessment
      let spamRisk = 'good';
      if (answerRate < 30 && totalCalls > 10) {
        spamRisk = 'high'; // Likely spam flagged
      } else if (answerRate < 50 && totalCalls > 10) {
        spamRisk = 'medium'; // Warning
      }

      return {
        phoneNumber,
        period: `${days} days`,
        totalCalls,
        completedCalls,
        noAnswerCalls,
        failedCalls,
        canceledCalls,
        answerRate,
        avgDuration,
        spamRisk,
        calls: calls.slice(0, 50) // Return last 50 calls for detail view
      };
    } catch (error) {
      console.error('[Twilio] Error getting call stats:', error.message);
      throw new Error(`Failed to get call stats: ${error.message}`);
    }
  }

  // Get aggregated stats for all numbers
  async getAllNumbersCallStats(days = 7) {
    try {
      console.log(`[Twilio] getAllNumbersCallStats - Starting for ${days} days`);
      
      // ========================================
      // CHECK CACHE FIRST
      // ========================================
      const cacheKey = `call-analytics-${days}`;
      const now = Date.now();
      const cachedData = performanceCache.data[cacheKey];
      const cacheTime = performanceCache.timestamps[cacheKey];
      
      if (cachedData && cacheTime && (now - cacheTime) < performanceCache.CACHE_DURATION) {
        const cacheAge = Math.round((now - cacheTime) / 1000);
        console.log(`[Twilio] ⚡ Returning cached analytics (${cacheAge}s old)`);
        return {
          ...cachedData,
          cached: true,
          cacheAge: cacheAge
        };
      }
      
      console.log(`[Twilio] 🔄 Cache miss or expired, fetching fresh analytics data...`);
      
      // Calculate date range in EST timezone
      // Get current time in EST (UTC-5)
      const nowEST = new Date(Date.now() - (5 * 60 * 60 * 1000));
      
      // For "Today" (days=1), we want calls from start of today EST
      // For other ranges, we want last N days
      let startDate;
      if (days === 1) {
        // Start of today in EST
        startDate = new Date(nowEST);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // N days ago from now in EST
        startDate = new Date(nowEST);
        startDate.setDate(startDate.getDate() - days);
      }
      
      console.log(`[Twilio] Date range: ${startDate.toISOString()} to now (EST timezone)`);
      
      // Get all your numbers
      const numbers = await this.getAllNumbers();
      console.log(`[Twilio] Found ${numbers.length} numbers`);

      // Get all calls in date range - INCREASED LIMIT
      const allCalls = await this.getCallLogs({
        startDate: startDate.toISOString(),
        limit: 20000 // Increased from 5000 to capture more calls
      });

      console.log(`[Twilio] Processing ${allCalls.length} calls for ${numbers.length} numbers`);
      
      // Debug: Show sample call data
      if (allCalls.length > 0) {
        console.log('[Twilio] Sample call:', {
          from: allCalls[0].from,
          to: allCalls[0].to,
          direction: allCalls[0].direction,
          status: allCalls[0].status
        });
      }
      
      // Debug: Show sample number
      if (numbers.length > 0) {
        console.log('[Twilio] Sample number:', numbers[0].phoneNumber);
      }

      // Group calls by phone number
      const statsByNumber = numbers.map(number => {
        try {
          const numberCalls = allCalls.filter(call => call.from === number.phoneNumber);
          
          // Debug: Log numbers with calls
          if (numberCalls.length > 0) {
            console.log(`[Twilio] ${number.phoneNumber} has ${numberCalls.length} calls`);
          }
          
          const totalCalls = numberCalls.length;
          const completedCalls = numberCalls.filter(c => c.status === 'completed' && c.duration > 0).length;
          const noAnswerCalls = numberCalls.filter(c => c.status === 'no-answer').length;
          const failedCalls = numberCalls.filter(c => c.status === 'failed' || c.status === 'busy').length;

          const answeredCalls = numberCalls.filter(c => c.status === 'completed' && c.duration > 0);
          const avgDuration = answeredCalls.length > 0
            ? Math.round(answeredCalls.reduce((sum, c) => sum + c.duration, 0) / answeredCalls.length)
            : 0;

          const answerRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;

          // Spam risk assessment
          let spamRisk = 'good';
          if (answerRate < 30 && totalCalls > 10) {
            spamRisk = 'high';
          } else if (answerRate < 50 && totalCalls > 10) {
            spamRisk = 'medium';
          } else if (totalCalls === 0) {
            spamRisk = 'no-data';
          }

          return {
            phoneNumber: number.phoneNumber,
            friendlyName: number.friendlyName,
            sid: number.sid,
            totalCalls,
            completedCalls,
            noAnswerCalls,
            failedCalls,
            answerRate,
            avgDuration,
            spamRisk
          };
        } catch (err) {
          console.error(`[Twilio] Error processing number ${number.phoneNumber}:`, err);
          return {
            phoneNumber: number.phoneNumber,
            friendlyName: number.friendlyName,
            sid: number.sid,
            totalCalls: 0,
            completedCalls: 0,
            noAnswerCalls: 0,
            failedCalls: 0,
            answerRate: 0,
            avgDuration: 0,
            spamRisk: 'no-data'
          };
        }
      });

      // Sort by activity level (most calls first), then by spam risk
      statsByNumber.sort((a, b) => {
        // First priority: Sort by total calls (descending)
        if (b.totalCalls !== a.totalCalls) {
          return b.totalCalls - a.totalCalls;
        }
        
        // Second priority: If same call count, spam risk matters
        if (a.spamRisk === 'high' && b.spamRisk !== 'high') return -1;
        if (a.spamRisk !== 'high' && b.spamRisk === 'high') return 1;
        
        // Third priority: Answer rate (lower is worse)
        return a.answerRate - b.answerRate;
      });

      const result = {
        period: `${days} days`,
        numbers: statsByNumber,
        summary: {
          totalNumbers: numbers.length,
          totalCalls: statsByNumber.reduce((sum, n) => sum + n.totalCalls, 0), // Sum of calls from our numbers only
          hitLimit: allCalls.length >= 20000, // Flag if we hit the limit
          highRiskNumbers: statsByNumber.filter(n => n.spamRisk === 'high').length,
          mediumRiskNumbers: statsByNumber.filter(n => n.spamRisk === 'medium').length,
          goodNumbers: statsByNumber.filter(n => n.spamRisk === 'good').length,
          noDataNumbers: statsByNumber.filter(n => n.spamRisk === 'no-data').length
        }
      };

      console.log(`[Twilio] Successfully processed stats:`, result.summary);
      
      // IMPORTANT: Show 510 number breakdown for Analytics
      const setters510 = statsByNumber.filter(n => n.phoneNumber.includes('510'));
      const setterTotalCalls = setters510.reduce((sum, n) => sum + n.totalCalls, 0);
      console.log(`[Twilio] 📊 ANALYTICS 510 BREAKDOWN:`);
      console.log(`[Twilio]   Total 510 numbers in system: ${setters510.length}`);
      console.log(`[Twilio]   Total calls from 510 numbers: ${setterTotalCalls}`);
      console.log(`[Twilio]   Active 510 numbers (with calls): ${setters510.filter(n => n.totalCalls > 0).length}`);
      
      
      // ========================================
      // STORE IN CACHE
      // ========================================
      performanceCache.data[cacheKey] = result;
      performanceCache.timestamps[cacheKey] = Date.now();
      console.log(`[Twilio] ✅ Cached analytics data for ${days} days`);
      
      return result;
    } catch (error) {
      console.error('[Twilio] Error getting all call stats:', error.message);
      console.error('[Twilio] Error stack:', error.stack);
      throw new Error(`Failed to get all call stats: ${error.message}`);
    }
  }

  // Get setter performance analytics - NEW
  async getSetterPerformance(days = 7) {
    try {
      console.log(`[Twilio] getSetterPerformance - Starting for ${days} days`);
      
      // ========================================
      // CHECK CACHE FIRST
      // ========================================
      const cacheKey = `setter-performance-${days}`;
      const now = Date.now();
      const cachedData = performanceCache.data[cacheKey];
      const cacheTime = performanceCache.timestamps[cacheKey];
      
      if (cachedData && cacheTime && (now - cacheTime) < performanceCache.CACHE_DURATION) {
        const cacheAge = Math.round((now - cacheTime) / 1000);
        console.log(`[Twilio] ⚡ Returning cached data (${cacheAge}s old)`);
        return {
          ...cachedData,
          cached: true,
          cacheAge: cacheAge
        };
      }
      
      console.log(`[Twilio] 🔄 Cache miss or expired, fetching fresh data...`);
      
      // Calculate date range in EST timezone
      // Get current time in EST (UTC-5)
      const nowEST = new Date(Date.now() - (5 * 60 * 60 * 1000));
      
      // For "Today" (days=1), we want calls from start of today EST
      // For other ranges, we want last N days
      let startDate;
      if (days === 1) {
        // Start of today in EST
        startDate = new Date(nowEST);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // N days ago from now in EST
        startDate = new Date(nowEST);
        startDate.setDate(startDate.getDate() - days);
      }
      
      console.log(`[Twilio] Date range: ${startDate.toISOString()} to now (EST timezone)`);
      
      // Get all numbers from Twilio
      const numbers = await this.getAllNumbers();
      console.log(`[Twilio] Found ${numbers.length} Twilio numbers`);
      
      // Get GHL data to map linkedUser to numbers
      let ghlNumbers = [];
      let ghlUsers = [];
      let ghlOpportunities = [];
      
      try {
        const ghlService = (await import('./ghlService.js')).default;
        ghlNumbers = await ghlService.getPhoneNumbers();
        ghlUsers = await ghlService.getUsers();
        
        // Get opportunities for the date range (now startDate is defined!)
        ghlOpportunities = await ghlService.getOpportunities(startDate.toISOString(), null);
        
        console.log(`[Twilio] Found ${ghlNumbers.length} GHL numbers, ${ghlUsers.length} GHL users, ${ghlOpportunities.length} opportunities`);
      } catch (ghlError) {
        console.error('[Twilio] Error fetching GHL data:', ghlError.message);
        // Continue with empty GHL data - we'll just have no user mapping
      }
      
      // Create mapping of phone number -> GHL user ID
      const numberToUser = {};
      ghlNumbers.forEach(ghlNum => {
        if (ghlNum.linkedUser) {
          numberToUser[ghlNum.phoneNumber] = ghlNum.linkedUser;
        }
      });
      
      // Create set of VALID user IDs (only users with assigned numbers)
      // This excludes inactive/former employees who don't have numbers
      const validUserIds = new Set(Object.values(numberToUser));
      
      // Create mapping of GHL user ID -> user info
      const userMap = {};
      ghlUsers.forEach(user => {
        userMap[user.id] = {
          id: user.id,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          email: user.email
        };
      });
      
      console.log(`[Twilio] Mapped ${Object.keys(numberToUser).length} numbers to users`);
      console.log(`[Twilio] Valid active users with assigned numbers: ${validUserIds.size}`);
      console.log(`[Twilio] Sample number mappings:`, Object.entries(numberToUser).slice(0, 3));
      console.log(`[Twilio] Total GHL numbers received:`, ghlNumbers.length);
      
      
      const allCalls = await this.getCallLogs({
        startDate: startDate.toISOString(),
        limit: 20000
      });
      
      console.log(`[Twilio] Processing ${allCalls.length} calls`);
      
      // Helper to determine if number is setter (510), closer (650), or state
      const getNumberType = (phoneNumber) => {
        if (phoneNumber.includes('510')) return 'setter';
        if (phoneNumber.includes('650')) return 'closer';
        return 'state';
      };
      
      // Group calls by user
      const userStats = {};
      let unmappedCallCount = 0;
      let unmappedSamples = [];
      
      allCalls.forEach(call => {
        let userId = numberToUser[call.from];
        const numberType = getNumberType(call.from);
        
        // Handle "client:" format calls (from GHL web/desktop dialer)
        // Format: "client:userId-locationId"
        if (!userId && call.from.startsWith('client:')) {
          const match = call.from.match(/^client:([^-]+)-/);
          if (match) {
            userId = match[1]; // Extract userId from client string
            console.log(`[Twilio] Matched client call to user ${userId}`);
          }
        }
        
        // IMPORTANT: Only count users who have assigned phone numbers
        // This excludes inactive/former employees
        if (userId && !validUserIds.has(userId)) {
          console.log(`[Twilio] ⚠️ Skipping call from user without assigned number: ${userId} (${userMap[userId]?.name || 'Unknown'})`);
          unmappedCallCount++;
          if (unmappedSamples.length < 5) {
            unmappedSamples.push({ from: call.from, type: 'inactive-user', user: userMap[userId]?.name });
          }
          return; // Skip this call
        }
        
        // Skip if we can't map to a user (might be unassigned numbers)
        if (!userId) {
          unmappedCallCount++;
          if (unmappedSamples.length < 5) {
            unmappedSamples.push({ from: call.from, type: numberType });
          }
          return;
        }
        
        // Initialize user stats if needed
        if (!userStats[userId]) {
          userStats[userId] = {
            userId: userId,
            userName: userMap[userId]?.name || 'Unknown User',
            email: userMap[userId]?.email || '',
            totalCalls: 0,
            ownNumberCalls: 0,  // Calls from their 510/650 number
            stateNumberCalls: 0, // Calls from state numbers they're using
            completedCalls: 0,
            bookings: 0, // NEW: Track booked appointments
            answerRate: 0,
            avgDuration: 0,
            callsByDay: {},
            numberTypes: {
              setter: 0,
              closer: 0,
              state: 0
            }
          };
        }
        
        const stats = userStats[userId];
        stats.totalCalls++;
        
        // Track by number type
        if (numberType === 'setter' || numberType === 'closer') {
          stats.ownNumberCalls++;
        } else {
          stats.stateNumberCalls++;
        }
        
        stats.numberTypes[numberType]++;
        
        // Track completed calls
        if (call.status === 'completed' && call.duration > 0) {
          stats.completedCalls++;
        }
        
        // Track by day (convert to EST timezone)
        const callDateUTC = new Date(call.startTime);
        // Convert to EST (UTC-5) by subtracting 5 hours
        const callDateEST = new Date(callDateUTC.getTime() - (5 * 60 * 60 * 1000));
        const callDate = callDateEST.toISOString().split('T')[0];
        stats.callsByDay[callDate] = (stats.callsByDay[callDate] || 0) + 1;
      });
      
      // Calculate averages and sort
      const setterPerformance = Object.values(userStats).map(stats => {
        stats.answerRate = stats.totalCalls > 0 
          ? Math.round((stats.completedCalls / stats.totalCalls) * 100) 
          : 0;
        
        const completedCallsList = allCalls.filter(call => 
          numberToUser[call.from] === stats.userId && 
          call.status === 'completed' && 
          call.duration > 0
        );
        
        stats.avgDuration = completedCallsList.length > 0
          ? Math.round(completedCallsList.reduce((sum, c) => sum + c.duration, 0) / completedCallsList.length)
          : 0;
        
        // Match opportunities to this setter
        // Check if opportunity contact phone matches any of the setter's call destinations
        const setterCallDestinations = new Set(
          allCalls
            .filter(call => numberToUser[call.from] === stats.userId)
            .map(call => call.to.replace(/\D/g, '')) // Normalize phone
        );
        
        stats.bookings = ghlOpportunities.filter(opp => {
          const contactPhone = (opp.contact?.phone || '').replace(/\D/g, '');
          return contactPhone && setterCallDestinations.has(contactPhone);
        }).length;
        
        // Calculate conversion rate
        stats.conversionRate = stats.completedCalls > 0 
          ? Math.round((stats.bookings / stats.completedCalls) * 100) 
          : 0;
        
        return stats;
      });
      
      // Sort by total calls (highest first)
      setterPerformance.sort((a, b) => b.totalCalls - a.totalCalls);
      
      console.log(`[Twilio] Processed performance for ${setterPerformance.length} setters`);
      console.log(`[Twilio] ⚠️ Unmapped calls: ${unmappedCallCount} (not assigned to any user in GHL)`);
      if (unmappedSamples.length > 0) {
        console.log(`[Twilio] Unmapped sample calls:`, unmappedSamples);
      }
      
      // IMPORTANT: Show breakdown of 510 calls
      const all510Calls = allCalls.filter(c => c.from.includes('510'));
      const mapped510Calls = allCalls.filter(c => c.from.includes('510') && numberToUser[c.from]);
      const unmapped510Calls = allCalls.filter(c => c.from.includes('510') && !numberToUser[c.from]);
      
      console.log(`[Twilio] 📊 510 NUMBER BREAKDOWN:`);
      console.log(`[Twilio]   Total 510 calls: ${all510Calls.length}`);
      console.log(`[Twilio]   Mapped to setters: ${mapped510Calls.length}`);
      console.log(`[Twilio]   Unmapped (orphaned): ${unmapped510Calls.length}`);
      
      if (unmapped510Calls.length > 0) {
        const orphanNumbers = [...new Set(unmapped510Calls.map(c => c.from))];
        console.log(`[Twilio]   Orphaned 510 numbers making calls: ${orphanNumbers.length} numbers`);
        console.log(`[Twilio]   Sample orphaned numbers:`, orphanNumbers.slice(0, 5));
      }
      
      
      // Calculate actual setter calls total (not all calls in system)
      const totalSetterCalls = setterPerformance.reduce((sum, setter) => sum + setter.totalCalls, 0);
      
      const result = {
        period: `${days} days`,
        setters: setterPerformance,
        summary: {
          totalSetters: setterPerformance.length,
          totalCalls: totalSetterCalls, // FIX: Only count setter calls, not all calls
          avgCallsPerSetter: setterPerformance.length > 0 
            ? Math.round(totalSetterCalls / setterPerformance.length) 
            : 0
        }
      };
      
      // ========================================
      // STORE IN CACHE
      // ========================================
      performanceCache.data[cacheKey] = result;
      performanceCache.timestamps[cacheKey] = Date.now();
      console.log(`[Twilio] ✅ Cached data for ${days} days`);
      
      return result;
    } catch (error) {
      console.error('[Twilio] Error getting setter performance:', error.message);
      console.error('[Twilio] Error stack:', error.stack);
      throw new Error(`Failed to get setter performance: ${error.message}`);
    }
  }
}

const twilioService = new TwilioService();
export default twilioService;