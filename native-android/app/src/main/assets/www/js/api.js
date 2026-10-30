/**
 * Gelbooru API Client
 * Supports CapacitorHttp (native Android CORS bypass) and Web proxy fallback
 * Includes caching, rate-limit throttling, tag categorization, and blacklist filtering
 */

import { isNative, getPlugins } from './utils/capacitor.js';
import { getFromStore, putToStore } from './store.js';

const GELBOORU_BASE = 'https://gelbooru.com';

// In-memory cache for fast lookups
const memoryCache = new Map();

// Throttle queue: Gelbooru limits non-authenticated users
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 300; // ms

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Tag category map
export const TAG_CATEGORIES = {
  0: 'general',
  1: 'artist',
  3: 'copyright',
  4: 'character',
  5: 'metadata',
  // String fallbacks from autocomplete
  'tag': 'general',
  'general': 'general',
  'artist': 'artist',
  'copyright': 'copyright',
  'character': 'character',
  'metadata': 'metadata'
};

export const getTagCategoryName = (cat) => {
  return TAG_CATEGORIES[cat] || 'general';
};

/**
 * Perform HTTP GET with CapacitorHttp or Web proxy fallback
 */
export const httpGet = async (url) => {
  // Rate limiting / throttling
  const now = Date.now();
  const timeSinceLast = now - lastRequestTime;
  if (timeSinceLast < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLast);
  }
  lastRequestTime = Date.now();

  const plugins = getPlugins();

  // Method 1: Native Android CapacitorHttp
  if (isNative() && plugins.CapacitorHttp) {
    try {
      const res = await plugins.CapacitorHttp.get({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/1.0',
          'Referer': 'https://gelbooru.com/'
        }
      });
      if (typeof res.data === 'string') {
        try {
          return JSON.parse(res.data);
        } catch {
          return res.data;
        }
      }
      return res.data;
    } catch (err) {
      console.warn('CapacitorHttp failed, falling back to fetch:', err);
    }
  }

  // Method 2: Web Preview via Vite Proxy
  if (url.startsWith(GELBOORU_BASE)) {
    const proxyUrl = url.replace(GELBOORU_BASE, '/api/gelbooru');
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Vite proxy failed, trying public CORS proxy fallback:', err);
    }
  }

  // Method 3: Direct Fetch or Public CORS proxy
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch {
    // Try CORS proxy fallback for web
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(corsProxyUrl);
    if (res.ok) return await res.json();
  }

  throw new Error(`Failed to fetch: ${url}`);
};

/**
 * Fetch Posts from Gelbooru
 */
export const fetchPosts = async ({
  tags = '',
  page = 0,
  limit = 40,
  apiKey = '',
  userId = '',
  ratingFilter = 'standard',
  blacklist = []
}) => {
  // Construct search query
  // Android build keeps browsing restricted to general-rated posts.
  let finalTags = tags.trim().replace(/\brating:(?:sensitive|questionable|explicit)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (!/\brating:general\b/i.test(finalTags)) {
    finalTags = finalTags ? `${finalTags} rating:general` : 'rating:general';
  }

  let endpoint = `${GELBOORU_BASE}/index.php?page=dapi&s=post&q=index&json=1&pid=${page}&limit=${limit}`;
  if (finalTags) {
    endpoint += `&tags=${encodeURIComponent(finalTags)}`;
  }
  if (apiKey && userId) {
    endpoint += `&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(userId)}`;
  }

  // Check memory cache
  const cacheKey = `posts_${finalTags}_${page}_${limit}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const data = await httpGet(endpoint);
  
  // Gelbooru returns { "@attributes": { count, limit, offset }, "post": [...] }
  let rawPosts = [];
  let totalCount = 0;

  if (data) {
    if (Array.isArray(data.post)) {
      rawPosts = data.post;
    } else if (data.post && typeof data.post === 'object') {
      rawPosts = [data.post];
    }
    if (data['@attributes']?.count) {
      totalCount = parseInt(data['@attributes'].count, 10) || 0;
    }
  }

  // Normalize post format
  let posts = rawPosts.map(p => normalizePost(p));

  // Apply Rating Filter
  posts = posts.filter(p => p.rating === 'general' || p.rating === 'g');

  // Apply Blacklist
  let hiddenByBlacklist = 0;
  if (blacklist && blacklist.length > 0) {
    const lowerBlacklist = blacklist.map(t => t.toLowerCase().trim()).filter(Boolean);
    const filtered = [];
    for (const p of posts) {
      const pTags = p.tagsArray;
      const isBlacklisted = lowerBlacklist.some(bTag => pTags.includes(bTag));
      if (isBlacklisted) {
        hiddenByBlacklist++;
      } else {
        filtered.push(p);
      }
    }
    posts = filtered;
  }

  const result = {
    posts,
    totalCount,
    hiddenByBlacklist,
    page
  };

  // Cache in memory for 5 minutes
  memoryCache.set(cacheKey, result);
  setTimeout(() => memoryCache.delete(cacheKey), 300000);

  return result;
};

/**
 * Autocomplete Tags
 */
export const autocompleteTags = async (term) => {
  const query = term.trim();
  if (!query) return [];

  const cacheKey = `ac_${query}`;
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  const endpoint = `${GELBOORU_BASE}/index.php?page=autocomplete2&term=${encodeURIComponent(query)}&type=tag_query&limit=10`;
  try {
    const data = await httpGet(endpoint);
    let items = [];

    if (Array.isArray(data)) {
      items = data.map(item => {
        if (typeof item === 'string') {
          return { value: item, label: item, category: 'general', post_count: 0 };
        }
        return {
          value: item.value || item.label || '',
          label: item.label || item.value || '',
          category: getTagCategoryName(item.category || item.type || 0),
          post_count: parseInt(item.post_count || item.count || 0, 10)
        };
      });
    }

    memoryCache.set(cacheKey, items);
    setTimeout(() => memoryCache.delete(cacheKey), 120000);
    return items;
  } catch (err) {
    console.warn('Autocomplete fetch error:', err);
    return [];
  }
};

/**
 * Fetch Tag Metadata (Categories for full details sheet)
 */
export const fetchTagCategories = async (tagNamesArray) => {
  if (!tagNamesArray || tagNamesArray.length === 0) return {};

  const missing = [];
  const result = {};

  for (const name of tagNamesArray) {
    const cached = memoryCache.get(`tag_cat_${name}`);
    if (cached) {
      result[name] = cached;
    } else {
      missing.push(name);
    }
  }

  if (missing.length === 0) return result;

  // Batch query up to 50 tags
  const chunk = missing.slice(0, 50).join(' ');
  const endpoint = `${GELBOORU_BASE}/index.php?page=dapi&s=tag&q=index&json=1&names=${encodeURIComponent(chunk)}`;

  try {
    const data = await httpGet(endpoint);
    let tagList = [];
    if (Array.isArray(data?.tag)) {
      tagList = data.tag;
    } else if (data?.tag && typeof data.tag === 'object') {
      tagList = [data.tag];
    }

    for (const t of tagList) {
      const cat = getTagCategoryName(t.type);
      result[t.name] = cat;
      memoryCache.set(`tag_cat_${t.name}`, cat);
    }
  } catch (err) {
    console.warn('Tag info query failed:', err);
  }

  // For any tags still not returned, default to general
  for (const name of missing) {
    if (!result[name]) {
      result[name] = 'general';
    }
  }

  return result;
};

/**
 * Normalize Gelbooru Post Object
 */
export const normalizePost = (raw) => {
  const tagsStr = (raw.tags || '').trim();
  const tagsArray = tagsStr ? tagsStr.split(/\s+/).filter(Boolean) : [];

  // Determine media type
  let fileUrl = raw.file_url || '';
  let sampleUrl = raw.sample_url || fileUrl;
  let previewUrl = raw.preview_url || sampleUrl;

  const ext = (fileUrl.split('.').pop() || '').toLowerCase();
  const isVideo = ext === 'mp4' || ext === 'webm';
  const isGif = ext === 'gif';

  // Fallback to sample if original is missing
  if (!fileUrl && sampleUrl) fileUrl = sampleUrl;

  return {
    id: raw.id,
    file_url: fileUrl,
    sample_url: sampleUrl,
    preview_url: previewUrl,
    width: parseInt(raw.width, 10) || 800,
    height: parseInt(raw.height, 10) || 1200,
    aspect_ratio: (parseInt(raw.width, 10) || 800) / (parseInt(raw.height, 10) || 1200),
    rating: (raw.rating || 'g').toLowerCase(),
    score: parseInt(raw.score, 10) || 0,
    owner: raw.owner || raw.creator_id || 'anonymous',
    source: raw.source || '',
    created_at: raw.created_at || '',
    has_children: raw.has_children === 'true' || raw.has_children === true,
    parent_id: raw.parent_id ? parseInt(raw.parent_id, 10) : null,
    tags: tagsStr,
    tagsArray,
    isVideo,
    isGif,
    fileType: ext
  };
};

/**
 * Test Connection with API Key & User ID
 */
export const testApiConnection = async (apiKey, userId) => {
  try {
    const url = `${GELBOORU_BASE}/index.php?page=dapi&s=post&q=index&json=1&limit=1&api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(userId)}`;
    const data = await httpGet(url);
    return !!(data && (data.post || data['@attributes']));
  } catch (err) {
    console.error('Test connection error:', err);
    return false;
  }
};
