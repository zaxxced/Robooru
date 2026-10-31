/**
 * IndexedDB Local Storage Manager
 * Stores favorites, collections, history, saved searches, and app configuration
 */

const DB_NAME = 'BooruBrowserDB';
const DB_VERSION = 1;

let dbPromise = null;

export const initDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;

      // Settings store (key-value)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // Favorites store
      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'id' });
        favStore.createIndex('collection', 'collection', { unique: false });
        favStore.createIndex('added_at', 'added_at', { unique: false });
      }

      // Collections store
      if (!db.objectStoreNames.contains('collections')) {
        db.createObjectStore('collections', { keyPath: 'name' });
      }

      // History store
      if (!db.objectStoreNames.contains('history')) {
        const histStore = db.createObjectStore('history', { keyPath: 'id' });
        histStore.createIndex('viewed_at', 'viewed_at', { unique: false });
      }

      // Saved searches
      if (!db.objectStoreNames.contains('saved_searches')) {
        db.createObjectStore('saved_searches', { keyPath: 'query' });
      }

      // Recent searches
      if (!db.objectStoreNames.contains('recent_searches')) {
        const recentStore = db.createObjectStore('recent_searches', { keyPath: 'query' });
        recentStore.createIndex('searched_at', 'searched_at', { unique: false });
      }

      // API Response cache
      if (!db.objectStoreNames.contains('api_cache')) {
        const cacheStore = db.createObjectStore('api_cache', { keyPath: 'key' });
        cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

// Generic IDB Helpers
export const getFromStore = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const putToStore = async (storeName, val, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = key !== undefined ? store.put(val, key) : store.put(val);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const deleteFromStore = async (storeName, key) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllFromStore = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const clearStore = async (storeName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// Default Settings
export const DEFAULT_SETTINGS = {
  api_key: '',
  user_id: '',
  grid_columns: 2,
  image_quality: 'sample',
  data_saver: false,
  theme: 'dark',
  accent: 'violet',
  language: 'en',
  rating_filter: 'standard', // 'safe', 'standard', 'all'
  nsfw_blur: true,
  blacklist: ['scat', 'guro', 'vore', 'loli', 'shota'],
  pin_enabled: false,
  pin_code: '',
  age_gate_passed: false,
};

export const loadSettings = async () => {
  const settings = { ...DEFAULT_SETTINGS };
  try {
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const val = await getFromStore('settings', key);
      if (val !== undefined) {
        settings[key] = val;
      }
    }
  } catch (err) {
    console.warn('Failed to load settings from IndexedDB, using defaults:', err);
  }
  return settings;
};

export const saveSetting = async (key, val) => {
  return putToStore('settings', val, key);
};

// Favorites & Collections
export const addFavorite = async (post, collection = 'All') => {
  return putToStore('favorites', {
    id: post.id,
    collection,
    added_at: Date.now(),
    post
  });
};

export const removeFavorite = async (postId) => {
  return deleteFromStore('favorites', postId);
};

export const isFavorite = async (postId) => {
  const fav = await getFromStore('favorites', postId);
  return !!fav;
};

export const getFavorites = async (collection = null) => {
  const all = await getAllFromStore('favorites');
  all.sort((a, b) => b.added_at - a.added_at);
  if (!collection || collection === 'All') {
    return all;
  }
  return all.filter(f => f.collection === collection);
};

export const getCollections = async () => {
  const cols = await getAllFromStore('collections');
  const set = new Set(['All']);
  cols.forEach(c => set.add(c.name));
  return Array.from(set);
};

export const createCollection = async (name) => {
  const trimmed = name.trim();
  if (!trimmed) return;
  return putToStore('collections', { name: trimmed, created_at: Date.now() });
};

// Browsing History
export const addHistory = async (post) => {
  return putToStore('history', {
    id: post.id,
    viewed_at: Date.now(),
    post
  });
};

export const getHistory = async () => {
  const all = await getAllFromStore('history');
  all.sort((a, b) => b.viewed_at - a.viewed_at);
  return all;
};

export const clearHistory = async () => {
  return clearStore('history');
};

// Recent & Saved Searches
export const addRecentSearch = async (query) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  return putToStore('recent_searches', { query: trimmed, searched_at: Date.now() });
};

export const getRecentSearches = async (limit = 10) => {
  const all = await getAllFromStore('recent_searches');
  all.sort((a, b) => b.searched_at - a.searched_at);
  return all.slice(0, limit);
};

export const removeRecentSearch = async (query) => {
  return deleteFromStore('recent_searches', query);
};

export const clearRecentSearches = async () => {
  return clearStore('recent_searches');
};

export const saveSearch = async (query) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  return putToStore('saved_searches', { query: trimmed, saved_at: Date.now() });
};

export const getSavedSearches = async () => {
  return getAllFromStore('saved_searches');
};

export const removeSavedSearch = async (query) => {
  return deleteFromStore('saved_searches', query);
};

// Export & Import Favorites
export const exportFavoritesJSON = async () => {
  const favs = await getAllFromStore('favorites');
  const cols = await getAllFromStore('collections');
  return JSON.stringify({
    version: 1,
    exported_at: new Date().toISOString(),
    collections: cols,
    favorites: favs
  }, null, 2);
};

export const importFavoritesJSON = async (jsonString) => {
  const data = JSON.parse(jsonString);
  if (!data || !Array.isArray(data.favorites)) {
    throw new Error('Invalid favorites backup file');
  }

  if (Array.isArray(data.collections)) {
    for (const c of data.collections) {
      if (c && c.name) await createCollection(c.name);
    }
  }

  for (const f of data.favorites) {
    if (f && f.id && f.post) {
      await addFavorite(f.post, f.collection || 'All');
    }
  }
  return data.favorites.length;
};
