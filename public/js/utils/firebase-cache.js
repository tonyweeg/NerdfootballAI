/**
 * NerdFootball Firebase Cache Utility
 * Centralized Firebase document caching with TTL and validation
 */

class FirebaseCache {
    constructor(cachePath, ttlMinutes = 15) {
        this.cachePath = cachePath;
        this.ttlMilliseconds = ttlMinutes * 60 * 1000;
        this.inMemoryCache = {
            data: null,
            timestamp: null
        };
    }

    /**
     * Check if cached data is still valid based on creation date
     * @param {Date|string} createdDate - The cache creation timestamp
     * @returns {boolean} True if cache is valid
     */
    isValid(createdDate) {
        if (!createdDate) return false;

        const cacheTime = createdDate instanceof Date
            ? createdDate.getTime()
            : new Date(createdDate).getTime();

        const now = Date.now();
        return (now - cacheTime) < this.ttlMilliseconds;
    }

    /**
     * Check if in-memory cache is valid
     * @returns {boolean} True if in-memory cache exists and is not expired
     */
    isInMemoryCacheValid() {
        if (!this.inMemoryCache.data || !this.inMemoryCache.timestamp) {
            return false;
        }
        return (Date.now() - this.inMemoryCache.timestamp) < this.ttlMilliseconds;
    }

    /**
     * Load cached data from Firebase with automatic expiry checking
     * @param {Object} db - Firestore database instance
     * @returns {Promise<Object|null>} Cached data or null if expired/missing
     */
    async load(db) {
        try {
            console.log(`🔥 FIREBASE_CACHE: Loading from ${this.cachePath}...`);

            // Check in-memory cache first
            if (this.isInMemoryCacheValid()) {
                console.log('🔥 FIREBASE_CACHE: Using in-memory cache (hot cache)');
                return this.inMemoryCache.data;
            }

            // Load from Firebase
            const cacheDoc = await db.doc(this.cachePath).get();

            if (!cacheDoc.exists) {
                console.log('🔥 FIREBASE_CACHE: No cached document found');
                return null;
            }

            const cacheData = cacheDoc.data();

            // Validate cache age
            if (!this.isValid(cacheData.createdDate)) {
                console.log('🔥 FIREBASE_CACHE: Cache expired, needs refresh');
                return null;
            }

            // Store in memory for subsequent fast access
            this.inMemoryCache.data = cacheData;
            this.inMemoryCache.timestamp = Date.now();

            console.log('🔥 FIREBASE_CACHE: Cache loaded successfully');
            return cacheData;

        } catch (error) {
            console.error('🔥 FIREBASE_CACHE: Load failed:', error);
            return null;
        }
    }

    /**
     * Save data to Firebase cache
     * @param {Object} db - Firestore database instance
     * @param {Object} data - Data to cache
     * @returns {Promise<boolean>} True if save succeeded
     */
    async save(db, data) {
        try {
            const cacheData = {
                ...data,
                createdDate: new Date().toISOString(),
                ttlMinutes: this.ttlMilliseconds / 60000
            };

            await db.doc(this.cachePath).set(cacheData);

            // Update in-memory cache
            this.inMemoryCache.data = cacheData;
            this.inMemoryCache.timestamp = Date.now();

            console.log(`🔥 FIREBASE_CACHE: Data cached at ${this.cachePath}`);
            return true;

        } catch (error) {
            console.error('🔥 FIREBASE_CACHE: Save failed:', error);
            return false;
        }
    }

    /**
     * Clear cache (both Firebase and in-memory)
     * @param {Object} db - Firestore database instance
     * @returns {Promise<boolean>} True if clear succeeded
     */
    async clear(db) {
        try {
            await db.doc(this.cachePath).delete();

            this.inMemoryCache.data = null;
            this.inMemoryCache.timestamp = null;

            console.log(`🔥 FIREBASE_CACHE: Cache cleared at ${this.cachePath}`);
            return true;

        } catch (error) {
            console.error('🔥 FIREBASE_CACHE: Clear failed:', error);
            return false;
        }
    }

    /**
     * Get cache metadata without loading full data
     * @param {Object} db - Firestore database instance
     * @returns {Promise<Object|null>} Cache metadata or null
     */
    async getMetadata(db) {
        try {
            const cacheDoc = await db.doc(this.cachePath).get();

            if (!cacheDoc.exists) {
                return null;
            }

            const data = cacheDoc.data();
            return {
                createdDate: data.createdDate,
                ttlMinutes: data.ttlMinutes,
                isValid: this.isValid(data.createdDate),
                age: data.createdDate
                    ? Math.floor((Date.now() - new Date(data.createdDate).getTime()) / 1000)
                    : null
            };

        } catch (error) {
            console.error('🔥 FIREBASE_CACHE: Metadata fetch failed:', error);
            return null;
        }
    }
}

/**
 * Cache Manager - manages multiple named caches
 */
class FirebaseCacheManager {
    constructor() {
        this.caches = new Map();
    }

    /**
     * Register a named cache
     * @param {string} name - Cache identifier
     * @param {string} cachePath - Firebase document path
     * @param {number} ttlMinutes - Time to live in minutes
     * @returns {FirebaseCache} The created cache instance
     */
    registerCache(name, cachePath, ttlMinutes = 15) {
        const cache = new FirebaseCache(cachePath, ttlMinutes);
        this.caches.set(name, cache);
        return cache;
    }

    /**
     * Get a registered cache by name
     * @param {string} name - Cache identifier
     * @returns {FirebaseCache|null} Cache instance or null if not found
     */
    getCache(name) {
        return this.caches.get(name) || null;
    }

    /**
     * Load data from a named cache
     * @param {string} name - Cache identifier
     * @param {Object} db - Firestore database instance
     * @returns {Promise<Object|null>} Cached data or null
     */
    async load(name, db) {
        const cache = this.getCache(name);
        return cache ? await cache.load(db) : null;
    }

    /**
     * Save data to a named cache
     * @param {string} name - Cache identifier
     * @param {Object} db - Firestore database instance
     * @param {Object} data - Data to cache
     * @returns {Promise<boolean>} True if save succeeded
     */
    async save(name, db, data) {
        const cache = this.getCache(name);
        return cache ? await cache.save(db, data) : false;
    }

    /**
     * Clear a named cache
     * @param {string} name - Cache identifier
     * @param {Object} db - Firestore database instance
     * @returns {Promise<boolean>} True if clear succeeded
     */
    async clear(name, db) {
        const cache = this.getCache(name);
        return cache ? await cache.clear(db) : false;
    }

    /**
     * Clear all registered caches
     * @param {Object} db - Firestore database instance
     * @returns {Promise<Object>} Results object with success counts
     */
    async clearAll(db) {
        const results = {
            total: this.caches.size,
            succeeded: 0,
            failed: 0
        };

        for (const [name, cache] of this.caches.entries()) {
            const success = await cache.clear(db);
            if (success) {
                results.succeeded++;
            } else {
                results.failed++;
            }
        }

        return results;
    }
}

// Create and export singleton manager
const cacheManager = new FirebaseCacheManager();

// Register common caches for NerdFootball
cacheManager.registerCache(
    'ai-predictions',
    'artifacts/nerdfootball/pools/nerduniverse-2025/cache/latest-ai-intel-sheet',
    15 // 15 minutes
);

cacheManager.registerCache(
    'espn-scoreboard',
    'cache/espn_current_data',
    360 // 6 hours (360 minutes)
);

// Export for ES6 modules
export { FirebaseCache, FirebaseCacheManager, cacheManager };

// Also make available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.FirebaseCache = FirebaseCache;
    window.FirebaseCacheManager = FirebaseCacheManager;
    window.cacheManager = cacheManager;
}
