import express from 'express';
import twilioService from '../services/twilioService.js';

const router = express.Router();

// GET /api/analytics/overview - Get overall call statistics for all numbers
router.get('/overview', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    console.log(`[Analytics] Getting overview for last ${days} days`);
    
    const stats = await twilioService.getAllNumbersCallStats(parseInt(days));
    
    console.log(`[Analytics] Successfully got stats:`, {
      totalNumbers: stats.numbers?.length || 0,
      totalCalls: stats.summary?.totalCalls || 0
    });
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Analytics] Error getting overview:', error.message);
    console.error('[Analytics] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// GET /api/analytics/number/:phoneNumber - Get detailed stats for specific number
router.get('/number/:phoneNumber', async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const { days = 7 } = req.query;
    
    // URL decode the phone number
    const decodedNumber = decodeURIComponent(phoneNumber);
    
    console.log(`[Analytics] Getting stats for ${decodedNumber}`);
    
    const stats = await twilioService.getNumberCallStats(decodedNumber, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Analytics] Error getting number stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/analytics/calls - Get raw call logs with filters
router.get('/calls', async (req, res) => {
  try {
    const { phoneNumber, startDate, endDate, limit = 100, status } = req.query;
    
    console.log(`[Analytics] Getting call logs with filters`);
    
    const calls = await twilioService.getCallLogs({
      phoneNumber: phoneNumber ? decodeURIComponent(phoneNumber) : null,
      startDate,
      endDate,
      limit: parseInt(limit),
      status
    });
    
    res.json({
      success: true,
      count: calls.length,
      calls
    });
  } catch (error) {
    console.error('[Analytics] Error getting calls:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/analytics/setters - Get setter performance analytics
router.get('/setters', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    console.log(`[Analytics] Getting setter performance for last ${days} days`);
    
    const stats = await twilioService.getSetterPerformance(parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Analytics] Error getting setter performance:', error.message);
    console.error('[Analytics] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;