/**
 * Optimized RTDB Client for NerdFootball
 * Implements 3-tier caching and connection pooling
 */
class RTDBClient {
  constructor() {
    this.db = null;
    this.cache = new Map();
    this.listeners = new Map();
    this.connectionPool = null;
    this.lastUpdate = 0;
    this.updateThreshold = 5000; // 5 seconds
  }

  /**
   * Initialize with optimal configuration
   */
  async initialize() {
    // Initialize Firebase if not already done
    if (!firebase.apps.length) {
      firebase.initializeApp({
        databaseURL: 'https://nerdfootball-355514-default-rtdb.firebaseio.com'
      });
    }
    
    this.db = firebase.database();
    
    // Setup connection pooling
    this.setupConnectionPool();
    
    // Initialize IndexedDB cache
    await this.initIndexedDB();
    
    // Setup presence system
    this.setupPresence();
  }

  /**
   * Connection pool to minimize connections
   */
  setupConnectionPool() {
    this.connectionPool = {
      active: false,
      reconnectTimer: null,
      reconnectDelay: 1000,
      
      connect: () => {
        if (!this.connectionPool.active) {
          this.db.goOnline();
          this.connectionPool.active = true;
          console.log('RTDB connected');
        }
      },
      
      disconnect: () => {
        if (this.connectionPool.active) {
          this.db.goOffline();
          this.connectionPool.active = false;
          console.log('RTDB disconnected');
        }
      },
      
      handleError: () => {
        this.connectionPool.reconnectDelay = Math.min(
          this.connectionPool.reconnectDelay * 2,
          30000
        );
        
        this.connectionPool.reconnectTimer = setTimeout(() => {
          this.connectionPool.connect();
        }, this.connectionPool.reconnectDelay);
      }
    };
  }

  /**
   * Three-tier caching system
   */
  async getScores(week) {
    // Level 1: Memory cache (instant)
    const memCached = this.cache.get(`week${week}`);
    if (memCached && Date.now() - memCached.timestamp < this.updateThreshold) {
      console.log('Serving from memory cache');
      return memCached.data;
    }

    // Level 2: IndexedDB (5ms)
    const dbCached = await this.getFromIndexedDB(`week${week}`);
    if (dbCached && Date.now() - dbCached.timestamp < this.updateThreshold) {
      console.log('Serving from IndexedDB');
      this.cache.set(`week${week}`, dbCached);
      return dbCached.data;
    }

    // Level 3: Firebase RTDB
    console.log('Fetching from RTDB');
    return this.fetchFromRTDB(week);
  }

  /**
   * Optimized RTDB fetching with compression
   */
  async fetchFromRTDB(week) {
    this.connectionPool.connect();
    
    const ref = this.db.ref(`liveScores/2025/week${week}`);
    const snapshot = await ref.once('value');
    const compressed = snapshot.val();
    
    if (!compressed || !compressed.data) {
      return null;
    }
    
    // Decompress data
    const games = this.decompressData(compressed.data);
    
    // Update all cache layers
    const cacheData = {
      data: games,
      timestamp: Date.now()
    };
    
    this.cache.set(`week${week}`, cacheData);
    await this.saveToIndexedDB(`week${week}`, cacheData);
    
    return games;
  }

  /**
   * Setup real-time listener with batching
   */
  subscribeToWeek(week, callback) {
    // Prevent duplicate listeners
    if (this.listeners.has(week)) {
      return this.listeners.get(week);
    }
    
    this.connectionPool.connect();
    
    const ref = this.db.ref(`liveScores/2025/week${week}`);
    
    // Use transaction for atomic reads
    const listener = ref.on('value', snapshot => {
      const compressed = snapshot.val();
      if (compressed && compressed.data) {
        const games = this.decompressData(compressed.data);
        
        // Update cache
        const cacheData = {
          data: games,
          timestamp: Date.now()
        };
        this.cache.set(`week${week}`, cacheData);
        
        // Debounce callback
        if (Date.now() - this.lastUpdate > 1000) {
          this.lastUpdate = Date.now();
          callback(games);
        }
      }
    });
    
    this.listeners.set(week, { ref, listener });
    return listener;
  }

  /**
   * Cleanup listener
   */
  unsubscribeFromWeek(week) {
    const subscription = this.listeners.get(week);
    if (subscription) {
      subscription.ref.off('value', subscription.listener);
      this.listeners.delete(week);
      
      // Disconnect if no active listeners
      if (this.listeners.size === 0) {
        this.connectionPool.disconnect();
      }
    }
  }

  /**
   * Data compression/decompression
   */
  decompressData(compressed) {
    return compressed.split('|').map(game => {
      const [home, away, quarter, time] = game.split(':');
      return {
        homeScore: parseInt(home),
        awayScore: parseInt(away),
        quarter: parseInt(quarter),
        timeRemaining: time
      };
    });
  }

  /**
   * IndexedDB operations
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('RTDBCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.idb = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores', { keyPath: 'id' });
        }
      };
    });
  }

  async saveToIndexedDB(key, data) {
    const transaction = this.idb.transaction(['scores'], 'readwrite');
    const store = transaction.objectStore('scores');
    return store.put({ id: key, ...data });
  }

  async getFromIndexedDB(key) {
    const transaction = this.idb.transaction(['scores'], 'readonly');
    const store = transaction.objectStore('scores');
    const request = store.get(key);
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Presence system for connection tracking
   */
  setupPresence() {
    if (!firebase.auth().currentUser) return;
    
    const uid = firebase.auth().currentUser.uid;
    const userStatusRef = this.db.ref(`presence/${uid}`);
    
    // Set online status
    userStatusRef.set({
      online: true,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Remove on disconnect
    userStatusRef.onDisconnect().set({
      online: false,
      lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
  }

  /**
   * Get active user count (for monitoring)
   */
  async getActiveUsers() {
    const snapshot = await this.db.ref('presence').once('value');
    const presence = snapshot.val() || {};
    
    return Object.values(presence).filter(user => 
      user.online || (Date.now() - user.lastSeen < 300000)
    ).length;
  }

  /**
   * Performance monitoring
   */
  measureLatency() {
    const start = performance.now();
    
    return this.db.ref('.info/serverTimeOffset').once('value')
      .then(() => {
        const latency = performance.now() - start;
        console.log(`RTDB latency: ${latency.toFixed(2)}ms`);
        return latency;
      });
  }
}

// Auto-initialize on load
const rtdbClient = new RTDBClient();
document.addEventListener('DOMContentLoaded', () => {
  rtdbClient.initialize().catch(console.error);
});