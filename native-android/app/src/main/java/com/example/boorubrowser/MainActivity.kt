package com.example.boorubrowser

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.ParcelFileDescriptor
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.webkit.WebViewAssetLoader
import java.net.HttpURLConnection
import java.net.URL
import java.util.HashMap
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private val referer = "https://gelbooru.com/"
    private val userAgent = "Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/2.1"

    // Images are fetched on this small pool and streamed back as they arrive, so a slow or stuck
    // image never blocks the WebView's request thread and the rest of the grid can show up top to bottom.
    private val imagePool = Executors.newFixedThreadPool(6)
    private val imageMimeByExt = mapOf(
        "jpg" to "image/jpeg", "jpeg" to "image/jpeg", "png" to "image/png",
        "gif" to "image/gif", "webp" to "image/webp", "avif" to "image/avif"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(18, 20, 26)
        window.navigationBarColor = android.graphics.Color.rgb(18, 20, 26)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        assetLoader = WebViewAssetLoader.Builder()
            .setDomain("localhost")
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(18, 20, 26))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = true
            settings.loadsImagesAutomatically = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.userAgentString = userAgent
            addJavascriptInterface(NativeBridge(), "BooruNative")
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                    interceptDownloadedFile(request.url)?.let { return it }
                    assetLoader.shouldInterceptRequest(request.url)?.let { return it }
                    val uri = request.url
                    val host = uri.host.orEmpty()
                    if (uri.scheme == "https" && request.method.equals("GET", true) &&
                        (host == "gelbooru.com" || host.endsWith(".gelbooru.com"))) {
                        // Plain image files: stream without blocking. Range requests (video) and
                        // API/JSON calls keep the blocking path below because they need exact headers.
                        if (request.requestHeaders["Range"] == null) {
                            streamImageAsync(uri)?.let { return it }
                        }
                        fetchWithReferer(uri.toString(), request.requestHeaders)?.let { return it }
                    }
                    return super.shouldInterceptRequest(view, request)
                }
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.scheme == "http" || uri.scheme == "https") {
                        if (uri.host == "localhost" || uri.host?.endsWith("gelbooru.com") == true) return false
                        return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (_: Exception) { true }
                    }
                    return false
                }
            }
        }
        setContentView(webView)
        webView.loadUrl("https://localhost/assets/www/index.html")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));", null)
            }
        })
    }

    private fun interceptDownloadedFile(uri: Uri): WebResourceResponse? {
        if (uri.scheme != "https" || uri.host != "localhost" || !uri.path.orEmpty().startsWith("/downloads/")) return null
        val id = uri.lastPathSegment?.toLongOrNull() ?: return null
        return try {
            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
                if (cursor == null || !cursor.moveToFirst()) return null
                if (cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) != DownloadManager.STATUS_SUCCESSFUL) return null
                val mimeIndex = cursor.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE)
                val mime = if (mimeIndex >= 0) cursor.getString(mimeIndex) else null
                val descriptor = manager.openDownloadedFile(id)
                val headers = HashMap<String, String>()
                headers["Cache-Control"] = "no-store"
                WebResourceResponse(mime?.takeIf { it.isNotBlank() } ?: "application/octet-stream", null, 200, "OK", headers, android.os.ParcelFileDescriptor.AutoCloseInputStream(descriptor))
            }
        } catch (_: Exception) { null }
    }

    /**
     * Returns immediately with a pipe, and fills it from a pool thread. The mime type comes from the
     * file extension because the real response headers are not known yet. If the download fails the pipe
     * is closed empty, the <img> fires onerror, and the JS falls back to the next URL.
     */
    private fun streamImageAsync(uri: Uri): WebResourceResponse? {
        val ext = uri.lastPathSegment?.substringAfterLast('.', "")?.lowercase().orEmpty()
        val mime = imageMimeByExt[ext] ?: return null
        return try {
            val pipe = ParcelFileDescriptor.createPipe()
            val input = ParcelFileDescriptor.AutoCloseInputStream(pipe[0])
            val output = ParcelFileDescriptor.AutoCloseOutputStream(pipe[1])
            val url = uri.toString()
            imagePool.execute {
                var conn: HttpURLConnection? = null
                try {
                    val c = URL(url).openConnection() as HttpURLConnection
                    conn = c
                    c.connectTimeout = 10000
                    c.readTimeout = 15000
                    c.setRequestProperty("Referer", referer)
                    c.setRequestProperty("User-Agent", userAgent)
                    c.setRequestProperty("Accept", "image/*,*/*;q=0.8")
                    if (c.responseCode == 200) {
                        c.inputStream.use { it.copyTo(output) }
                    }
                } catch (_: Exception) {
                    // network error or the WebView cancelled the request: just close the pipe
                } finally {
                    try { output.close() } catch (_: Exception) {}
                    conn?.disconnect()
                }
            }
            val headers = HashMap<String, String>()
            headers["Access-Control-Allow-Origin"] = "*"
            WebResourceResponse(mime, null, 200, "OK", headers, input)
        } catch (_: Exception) { null }
    }

    private fun fetchWithReferer(url: String, requestHeaders: Map<String, String>): WebResourceResponse? {
        return try {
            val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                connectTimeout = 15000
                readTimeout = 30000
                setRequestProperty("Referer", referer)
                setRequestProperty("User-Agent", userAgent)
                requestHeaders["Range"]?.let { setRequestProperty("Range", it) }
                requestHeaders["Accept"]?.let { setRequestProperty("Accept", it) }
            }
            val code = conn.responseCode
            if (code !in 200..599 || code in 300..399) return null
            val stream = if (code >= 400) conn.errorStream ?: return null else conn.inputStream
            val parts = (conn.contentType ?: "application/octet-stream").split(";")
            val mime = parts.first().trim()
            val charset = parts.drop(1).firstOrNull { it.trim().startsWith("charset=", true) }?.trim()?.substringAfter("=")
            val headers = HashMap<String, String>()
            headers["Access-Control-Allow-Origin"] = "*"
            conn.getHeaderField("Content-Range")?.let { headers["Content-Range"] = it }
            conn.getHeaderField("Accept-Ranges")?.let { headers["Accept-Ranges"] = it }
            WebResourceResponse(mime, charset, code, conn.responseMessage ?: "OK", headers, stream)
        } catch (_: Exception) { null }
    }

    inner class NativeBridge {
        @JavascriptInterface
        fun download(url: String?, filename: String?): Long {
            return try {
                if (url == null || !url.startsWith("https://")) return -1
                val safe = (filename ?: "gelbooru_image").ifBlank { "gelbooru_image" }.replace(Regex("[^A-Za-z0-9._-]"), "_")
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    addRequestHeader("Referer", referer)
                    addRequestHeader("User-Agent", userAgent)
                    setTitle(safe)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_PICTURES, "Booru/$safe")
                    allowScanningByMediaScanner()
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
            } catch (_: Exception) { -1 }
        }

        @JavascriptInterface
        fun getDownloadedFileUrl(id: Long): String {
            return try {
                val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                manager.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
                    if (cursor != null && cursor.moveToFirst() &&
                        cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)) == DownloadManager.STATUS_SUCCESSFUL
                    ) "https://localhost/downloads/$id" else ""
                }
            } catch (_: Exception) { "" }
        }

        @JavascriptInterface
        fun downloadProgress(id: Long): String {
            return try {
                val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                manager.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
                    if (cursor == null || !cursor.moveToFirst()) return "failed,0,0"
                    val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                    val got = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                    val total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                    val state = when (status) {
                        DownloadManager.STATUS_SUCCESSFUL -> "complete"
                        DownloadManager.STATUS_FAILED -> "failed"
                        else -> "active"
                    }
                    "$state,$got,$total"
                }
            } catch (_: Exception) { "failed,0,0" }
        }

        @JavascriptInterface
        fun share(title: String, text: String, url: String) {
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, listOf(text, url).filter { it.isNotBlank() }.joinToString("\n"))
                }
                startActivity(Intent.createChooser(send, "Share Booru Post"))
            }
        }

        @JavascriptInterface fun exitApp() { runOnUiThread { finish() } }

        @JavascriptInterface
        fun setStatusBarColor(color: String, darkIcons: Boolean) {
            runOnUiThread {
                try { window.statusBarColor = android.graphics.Color.parseColor(color) } catch (_: Exception) {}
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = if (darkIcons) View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR else 0
            }
        }
    }

    override fun onDestroy() {
        imagePool.shutdownNow()
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
