/**
 * Internationalization (i18n) Module
 * English & Indonesian (Bahasa Indonesia)
 */

export const translations = {
  en: {
    // Navigation
    nav_browse: 'Browse',
    nav_search: 'Search',
    nav_favorites: 'Favorites',
    nav_history: 'History',
    nav_settings: 'Settings',

    // Header & Actions
    app_title: 'Yoibooru',
    search_placeholder: 'Search tags (e.g. 1girl landscape)...',
    load_original: 'Load Original',
    original_loaded: 'Original (HD)',
    download_starting: 'Starting download...',
    download_complete: 'Saved successfully!',
    copied_to_clipboard: 'Link copied to clipboard!',
    share: 'Share',
    save_favorite: 'Favorite',
    post_info: 'Details',
    tag_excluded: 'Tag excluded: ',
    tag_added: 'Tag added: ',
    posts_hidden_blacklist: 'posts hidden by blacklist',

    // Categories
    cat_general: 'General',
    cat_artist: 'Artist',
    cat_copyright: 'Copyright',
    cat_character: 'Character',
    cat_metadata: 'Metadata',

    // Post Details
    details_title: 'Post Details',
    details_id: 'Post ID',
    details_score: 'Score',
    details_rating: 'Rating',
    details_dimensions: 'Dimensions',
    details_created: 'Uploaded',
    details_source: 'Source',
    details_uploader: 'Uploader',
    details_view_original: 'Open in Browser',
    details_hint: 'Tap tag to search • Long-press to exclude (-)',

    // Ratings
    rating_general: 'General',
    rating_sensitive: 'Sensitive',
    rating_questionable: 'Questionable',
    rating_explicit: 'Explicit',

    // Favorites & Collections
    fav_title: 'Favorites',
    fav_all: 'All Favorites',
    fav_collections: 'Collections',
    fav_new_collection: 'New Collection',
    fav_empty_title: 'No favorites yet',
    fav_empty_desc: 'Tap the heart icon when viewing an image to save it here.',
    fav_export: 'Export JSON',
    fav_import: 'Import JSON',
    fav_exported: 'Favorites exported successfully',
    fav_imported: 'Favorites imported successfully',
    collection_created: 'Collection created!',
    collection_name_prompt: 'Collection name:',

    // History
    hist_title: 'Browsing History',
    hist_clear: 'Clear All',
    hist_empty_title: 'No history',
    hist_empty_desc: 'Posts you open and inspect will appear here.',
    hist_cleared: 'History cleared',

    // Search Screen
    search_recent: 'Recent Searches',
    search_saved: 'Saved Searches',
    search_clear_recent: 'Clear',
    search_save_query: 'Save this search',
    search_filters: 'Quick Filters',
    search_sort: 'Sort By',
    sort_score: 'Score (High to Low)',
    sort_id_desc: 'Newest First',
    sort_id_asc: 'Oldest First',

    // Settings
    settings_title: 'Settings',
    settings_account: 'Gelbooru Credentials',
    settings_api_key: 'API Key',
    settings_user_id: 'User ID',
    settings_test_conn: 'Save & Test API',
    settings_api_help: 'Optional: Required for higher rate limits and your Gelbooru account.',
    settings_api_success: 'Connected to Gelbooru successfully!',
    settings_api_fail: 'Failed to verify Gelbooru credentials.',

    settings_display: 'Display & Appearance',
    settings_theme: 'Theme',
    theme_dark: 'Dark (Charcoal)',
    theme_amoled: 'AMOLED (Pitch Black)',
    theme_light: 'Light',
    settings_accent: 'Accent Color',
    settings_grid_cols: 'Grid Columns',
    settings_data_saver: 'Data Saver',
    settings_data_saver_desc: 'Lower thumbnail resolutions and disable preloading',

    settings_content: 'Content & Safety',
    settings_rating_filter: 'Content Rating Filter',
    rating_filter_safe: 'General Only (Safe)',
    rating_filter_standard: 'General + Sensitive (Default)',
    rating_filter_all: 'Unrestricted (All Ratings)',
    settings_nsfw_blur: 'NSFW Gallery Blur',
    settings_nsfw_blur_desc: 'Blur sensitive/explicit thumbnails in the feed',
    settings_blacklist: 'Tag Blacklist',
    settings_blacklist_placeholder: 'Separate tags with commas or spaces...',
    settings_save_blacklist: 'Save Blacklist',

    settings_security: 'Security & Privacy',
    settings_pin_lock: 'PIN Lock',
    settings_pin_lock_desc: 'Require a 4-digit PIN on app launch',
    settings_set_pin: 'Set / Change PIN',
    settings_pin_saved: 'PIN updated successfully',
    settings_pin_removed: 'PIN lock disabled',

    settings_storage: 'Storage & Cache',
    settings_clear_cache: 'Clear Cache',
    settings_clear_cache_desc: 'Remove cached thumbnails and API responses',
    settings_reset_all: 'Reset All Data',
    settings_cache_cleared: 'Cache cleared successfully',

    settings_language: 'Language',
    settings_about: 'About Yoibooru',
    about_desc: 'Lightweight unofficial Gelbooru client for Android and Web. Inspired by Mori with pure HTML/CSS/JS and Capacitor.',
    about_disclaimer: 'Unofficial client, not affiliated with Gelbooru.',
    version: 'Version 1.0.0',

    // Age Gate
    gate_title: 'Age Verification',
    gate_body: 'Gelbooru contains user-submitted anime artwork, including NSFW and adult content. You must be at least 18 years old (or legal age in your jurisdiction) to proceed.',
    gate_accept: 'I am 18 or Older',
    gate_decline: 'Exit',

    // PIN Verification
    pin_enter: 'Enter PIN Code',
    pin_confirm: 'Confirm New PIN',
    pin_incorrect: 'Incorrect PIN. Try again.',

    // Empty & Errors
    no_results: 'No posts found',
    no_results_desc: 'Try searching with different tags or check your blacklist.',
    network_error: 'Unable to reach Gelbooru. Check your connection or API key.'
  },

  id: {
    // Navigation
    nav_browse: 'Jelajah',
    nav_search: 'Cari',
    nav_favorites: 'Favorit',
    nav_history: 'Riwayat',
    nav_settings: 'Pengaturan',

    // Header & Actions
    app_title: 'Yoibooru',
    search_placeholder: 'Cari tag (misal: 1girl pemandangan)...',
    load_original: 'Muat Gambar Asli',
    original_loaded: 'Asli (HD)',
    download_starting: 'Memulai unduhan...',
    download_complete: 'Berhasil disimpan!',
    copied_to_clipboard: 'Tautan disalin ke papan klip!',
    share: 'Bagikan',
    save_favorite: 'Favorit',
    post_info: 'Detail',
    tag_excluded: 'Tag dikecualikan: ',
    tag_added: 'Tag ditambahkan: ',
    posts_hidden_blacklist: 'postingan disembunyikan oleh daftar hitam',

    // Categories
    cat_general: 'Umum',
    cat_artist: 'Artis',
    cat_copyright: 'Hak Cipta',
    cat_character: 'Karakter',
    cat_metadata: 'Metadata',

    // Post Details
    details_title: 'Detail Postingan',
    details_id: 'ID Postingan',
    details_score: 'Skor',
    details_rating: 'Rating',
    details_dimensions: 'Dimensi',
    details_created: 'Diunggah',
    details_source: 'Sumber',
    details_uploader: 'Pengunggah',
    details_view_original: 'Buka di Browser',
    details_hint: 'Ketuk tag untuk mencari • Tahan untuk mengecualikan (-)',

    // Ratings
    rating_general: 'Umum',
    rating_sensitive: 'Sensitif',
    rating_questionable: 'Meragukan',
    rating_explicit: 'Eksplisit',

    // Favorites & Collections
    fav_title: 'Koleksi Favorit',
    fav_all: 'Semua Favorit',
    fav_collections: 'Koleksi',
    fav_new_collection: 'Koleksi Baru',
    fav_empty_title: 'Belum ada favorit',
    fav_empty_desc: 'Ketuk ikon hati saat melihat gambar untuk menyimpannya di sini.',
    fav_export: 'Ekspor JSON',
    fav_import: 'Impor JSON',
    fav_exported: 'Favorit berhasil diekspor',
    fav_imported: 'Favorit berhasil diimpor',
    collection_created: 'Koleksi baru dibuat!',
    collection_name_prompt: 'Nama koleksi:',

    // History
    hist_title: 'Riwayat Penjelajahan',
    hist_clear: 'Hapus Semua',
    hist_empty_title: 'Riwayat kosong',
    hist_empty_desc: 'Gambar yang Anda buka akan muncul di sini.',
    hist_cleared: 'Riwayat telah dihapus',

    // Search Screen
    search_recent: 'Pencarian Terkini',
    search_saved: 'Pencarian Tersimpan',
    search_clear_recent: 'Hapus',
    search_save_query: 'Simpan pencarian ini',
    search_filters: 'Filter Cepat',
    search_sort: 'Urutkan Berdasarkan',
    sort_score: 'Skor (Tertinggi)',
    sort_id_desc: 'Terbaru',
    sort_id_asc: 'Terlama',

    // Settings
    settings_title: 'Pengaturan',
    settings_account: 'Kredensial Gelbooru',
    settings_api_key: 'Kunci API',
    settings_user_id: 'User ID',
    settings_test_conn: 'Simpan & Uji API',
    settings_api_help: 'Opsional: Dibutuhkan untuk batas permintaan lebih tinggi & akun Gelbooru.',
    settings_api_success: 'Terhubung ke Gelbooru dengan sukses!',
    settings_api_fail: 'Gagal memverifikasi kredensial Gelbooru.',

    settings_display: 'Tampilan & Tema',
    settings_theme: 'Tema',
    theme_dark: 'Gelap (Arang)',
    theme_amoled: 'AMOLED (Hitam Pekat)',
    theme_light: 'Terang',
    settings_accent: 'Warna Aksen',
    settings_grid_cols: 'Kolom Kisi',
    settings_data_saver: 'Penghemat Data',
    settings_data_saver_desc: 'Gunakan resolusi thumbnail lebih rendah & matikan pramuat',

    settings_content: 'Konten & Keamanan',
    settings_rating_filter: 'Filter Rating Konten',
    rating_filter_safe: 'Hanya Umum (Aman)',
    rating_filter_standard: 'Umum + Sensitif (Bawaan)',
    rating_filter_all: 'Tanpa Batasan (Semua Rating)',
    settings_nsfw_blur: 'Kaburkan Gambar NSFW di Galeri',
    settings_nsfw_blur_desc: 'Buramkan thumbnail sensitif/eksplisit pada beranda',
    settings_blacklist: 'Daftar Hitam Tag',
    settings_blacklist_placeholder: 'Pisahkan tag dengan koma atau spasi...',
    settings_save_blacklist: 'Simpan Daftar Hitam',

    settings_security: 'Keamanan & Privasi',
    settings_pin_lock: 'Kunci PIN',
    settings_pin_lock_desc: 'Wajibkan PIN 4 angka saat membuka aplikasi',
    settings_set_pin: 'Atur / Ubah PIN',
    settings_pin_saved: 'PIN berhasil diperbarui',
    settings_pin_removed: 'Kunci PIN dinonaktifkan',

    settings_storage: 'Penyimpanan & Cache',
    settings_clear_cache: 'Bersihkan Cache',
    settings_clear_cache_desc: 'Hapus cache thumbnail dan respon API',
    settings_reset_all: 'Reset Semua Data',
    settings_cache_cleared: 'Cache berhasil dibersihkan',

    settings_language: 'Bahasa',
    settings_about: 'Tentang Yoibooru',
    about_desc: 'Klien Gelbooru ringan dan lancar untuk Android dan Web. Terinspirasi dari Mori menggunakan HTML/CSS/JS murni dan Capacitor.',
    about_disclaimer: 'Klien tidak resmi, tidak berafiliasi dengan Gelbooru.',
    version: 'Versi 1.0.0',

    // Age Gate
    gate_title: 'Verifikasi Umur',
    gate_body: 'Gelbooru memuat gambar anime dari pengguna termasuk konten dewasa (NSFW). Anda harus berusia minimal 18 tahun untuk melanjutkan.',
    gate_accept: 'Saya Berusia 18+ Tahun',
    gate_decline: 'Keluar',

    // PIN Verification
    pin_enter: 'Masukkan Kode PIN',
    pin_confirm: 'Konfirmasi PIN Baru',
    pin_incorrect: 'PIN salah. Silakan coba lagi.',

    // Empty & Errors
    no_results: 'Tidak ada postingan ditemukan',
    no_results_desc: 'Coba cari dengan tag berbeda atau periksa daftar hitam Anda.',
    network_error: 'Tidak dapat menjangkau Gelbooru. Periksa koneksi internet Anda.'
  }
};

let currentLang = 'en';

export const setLanguage = (lang) => {
  if (translations[lang]) {
    currentLang = lang;
    document.documentElement.setAttribute('lang', lang);
    applyI18nToDOM();
  }
};

export const getLanguage = () => currentLang;

export const t = (key, fallback = '') => {
  return translations[currentLang]?.[key] || translations.en[key] || fallback || key;
};

export const applyI18nToDOM = () => {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', t(key));
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', t(key));
    }
  });
};
