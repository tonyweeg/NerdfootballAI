const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Cost Monitoring and Budget Control System
 * Tracks RTDB usage and implements automatic throttling
 */

// Budget thresholds (in dollars)
const BUDGET_LIMITS = {
  warning: 3.00,      // 60% of $5 budget
  throttle: 4.00,     // 80% of $5 budget  
  critical: 4.75,     // 95% of $5 budget
  maximum: 5.00       // Hard limit
};

/**
 * Monitor RTDB usage and costs every 6 hours
 */
exports.monitorRTDBCosts = functions.pubsub
  .schedule('every 6 hours')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    const db = admin.database();
    const firestore = admin.firestore();
    
    try {
      // Get current month boundaries
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Fetch usage metrics
      const metrics = await collectUsageMetrics(db, firestore, monthStart, monthEnd);
      
      // Calculate projected costs
      const costs = calculateCosts(metrics);
      
      // Store metrics for tracking
      await firestore.collection('cost_metrics').add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        period: {
          start: monthStart.toISOString(),
          end: monthEnd.toISOString()
        },
        metrics,
        costs,
        status: determineBudgetStatus(costs.projected)
      });
      
      // Take action based on costs
      await handleBudgetThresholds(costs.projected, db);
      
      // Send alerts if needed
      await sendCostAlerts(costs);
      
      console.log('Cost monitoring complete:', costs);
      return costs;
      
    } catch (error) {
      console.error('Error monitoring costs:', error);
      throw error;
    }
  });

/**
 * Collect usage metrics from various sources
 */
async function collectUsageMetrics(db, firestore, startDate, endDate) {
  const metrics = {
    connections: 0,
    bandwidth: 0,
    storage: 0,
    reads: 0,
    writes: 0
  };
  
  try {
    // Get active connections from presence
    const presenceSnapshot = await db.ref('presence').once('value');
    const presence = presenceSnapshot.val() || {};
    metrics.connections = Object.keys(presence).length;
    
    // Estimate bandwidth based on data structure
    // Each game update is ~50 bytes compressed
    // 16 games * 50 bytes * updates per game
    const weeksInMonth = 4;
    const gamesPerWeek = 16;
    const updatesPerGame = 180; // 3 hours * 60 updates
    const bytesPerUpdate = 50;
    
    metrics.bandwidth = weeksInMonth * gamesPerWeek * updatesPerGame * bytesPerUpdate * metrics.connections;
    
    // Get storage size (scores data)
    const scoresSnapshot = await db.ref('liveScores').once('value');
    const scoresData = JSON.stringify(scoresSnapshot.val() || {});
    metrics.storage = scoresData.length;
    
    // Estimate reads/writes from Firestore logs if available
    const logsQuery = await firestore
      .collection('usage_logs')
      .where('timestamp', '>=', startDate)
      .where('timestamp', '<=', endDate)
      .get();
    
    logsQuery.forEach(doc => {
      const data = doc.data();
      metrics.reads += data.reads || 0;
      metrics.writes += data.writes || 0;
    });
    
  } catch (error) {
    console.error('Error collecting metrics:', error);
  }
  
  return metrics;
}

/**
 * Calculate costs based on metrics
 */
function calculateCosts(metrics) {
  const costs = {
    bandwidth: (metrics.bandwidth / 1073741824) * 1.00,  // $1/GB
    storage: (metrics.storage / 1073741824) * 0.10,      // $0.10/GB
    connections: 0,  // Free under 100k concurrent
    total: 0,
    projected: 0
  };
  
  costs.total = costs.bandwidth + costs.storage + costs.connections;
  
  // Project full month cost based on current day
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  costs.projected = (costs.total / currentDay) * daysInMonth;
  
  return costs;
}

/**
 * Determine budget status
 */
function determineBudgetStatus(projectedCost) {
  if (projectedCost >= BUDGET_LIMITS.maximum) {
    return 'EXCEEDED';
  } else if (projectedCost >= BUDGET_LIMITS.critical) {
    return 'CRITICAL';
  } else if (projectedCost >= BUDGET_LIMITS.throttle) {
    return 'THROTTLED';
  } else if (projectedCost >= BUDGET_LIMITS.warning) {
    return 'WARNING';
  } else {
    return 'NORMAL';
  }
}

/**
 * Handle budget thresholds with automatic actions
 */
async function handleBudgetThresholds(projectedCost, db) {
  const configRef = db.ref('config/costControl');
  
  if (projectedCost >= BUDGET_LIMITS.maximum) {
    // Emergency: Switch to polling mode
    await configRef.set({
      mode: 'polling',
      updateInterval: 60000,  // 1 minute polls
      reason: 'Budget exceeded',
      timestamp: Date.now()
    });
    
  } else if (projectedCost >= BUDGET_LIMITS.critical) {
    // Critical: Heavy throttling
    await configRef.set({
      mode: 'throttled',
      updateInterval: 30000,  // 30 second updates
      maxConnections: 50,
      reason: 'Critical budget threshold',
      timestamp: Date.now()
    });
    
  } else if (projectedCost >= BUDGET_LIMITS.throttle) {
    // Throttle: Reduce update frequency
    await configRef.set({
      mode: 'throttled',
      updateInterval: 15000,  // 15 second updates
      maxConnections: 75,
      reason: 'Budget throttling active',
      timestamp: Date.now()
    });
    
  } else if (projectedCost >= BUDGET_LIMITS.warning) {
    // Warning: Monitor closely
    await configRef.set({
      mode: 'normal',
      updateInterval: 5000,
      maxConnections: 100,
      reason: 'Budget warning',
      timestamp: Date.now()
    });
    
  } else {
    // Normal operation
    await configRef.set({
      mode: 'normal',
      updateInterval: 5000,
      maxConnections: 100,
      reason: 'Within budget',
      timestamp: Date.now()
    });
  }
}

/**
 * Send cost alerts via FCM
 */
async function sendCostAlerts(costs) {
  if (costs.projected < BUDGET_LIMITS.warning) {
    return; // No alert needed
  }
  
  const status = determineBudgetStatus(costs.projected);
  const message = {
    notification: {
      title: `RTDB Cost Alert: ${status}`,
      body: `Projected monthly cost: $${costs.projected.toFixed(2)} / $${BUDGET_LIMITS.maximum}`
    },
    data: {
      type: 'cost_alert',
      status,
      projected: costs.projected.toString(),
      budget: BUDGET_LIMITS.maximum.toString()
    },
    topic: 'admin-alerts'
  };
  
  try {
    await admin.messaging().send(message);
    console.log('Cost alert sent:', status);
  } catch (error) {
    console.error('Error sending cost alert:', error);
  }
}

/**
 * Manual cost check endpoint
 */
exports.checkCosts = functions.https.onCall(async (data, context) => {
  // Verify admin
  const ADMIN_UIDS = ['WxSPmEildJdqs6T5hIpBUZrscwt2', 'BPQvRhpVl1ZzsBXaS7C2iFe2Xpc2'];
  if (!context.auth || !ADMIN_UIDS.includes(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required');
  }
  
  const db = admin.database();
  const firestore = admin.firestore();
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const metrics = await collectUsageMetrics(db, firestore, monthStart, monthEnd);
  const costs = calculateCosts(metrics);
  
  return {
    metrics,
    costs,
    status: determineBudgetStatus(costs.projected),
    limits: BUDGET_LIMITS
  };
});

module.exports = {
  monitorRTDBCosts: exports.monitorRTDBCosts,
  checkCosts: exports.checkCosts
};