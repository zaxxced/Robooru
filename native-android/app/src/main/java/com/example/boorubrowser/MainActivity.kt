package com.example.boorubrowser

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import java.net.HttpURLConnection
import java.net.URL
import java.util.HashMap

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val referer = "https://gelbooru.com/"
    private val userAgent = "Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/2.0"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = android.graphics.Color.rgb(18, 20, 26)
        window.navigationBarColor = android.graphics.Color.rgb(18, 20, 26)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(18, 20, 26))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.loadsImagesAutomatically = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.userAgentString = userAgent
            addJavascriptInterface(NativeBridge(), "BooruNative")
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                    val uri = request.url
                    val host = uri.host.orEmpty()
                    if (uri.scheme == "https" && request.method.equals("GET", true) &&
                        (host == "gelbooru.com" || host.endsWith(".gelbooru.com"))) {
                        fetchWithReferer(uri.toString(), request.requestHeaders)?.let { return it }
                    }
                    return super.shouldInterceptRequest(view, request)
                }
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val uri = request.url
                    if (uri.scheme == "http" || uri.scheme == "https") {
                        if (uri.host?.endsWith("gelbooru.com") == true) return false
                        return try { startActivity(Intent(Intent.ACTION_VIEW, uri)); true } catch (_: Exception) { true }
                    }
                    return false
                }
            }
        }
        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));", null)
            }
        })
    }

    private fun fetchWithReferer(url: String, requestHeaders: Map<String, String>): WebResourceResponse? = try {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000; readTimeout = 30000
            setRequestProperty("Referer", referer); setRequestProperty("User-Agent", userAgent)
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

    inner class NativeBridge {
        @JavascriptInterface fun download(url: String?, filename: String?): Long = try {
            if (url == null || !url.startsWith("https://")) return -1
            val safe = (filename ?: "gelbooru_image").ifBlank { "gelbooru_image" }.replace(Regex("[^A-Za-z0-9._-]"), "_")
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                addRequestHeader("Referer", referer); addRequestHeader("User-Agent", userAgent)
                setTitle(safe); setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_PICTURES, "Booru/$safe")
                allowScanningByMediaScanner()
            }
            (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
        } catch (_: Exception) { -1 }

        @JavascriptInterface fun downloadProgress(id: Long): String = try {
            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.query(DownloadManager.Query().setFilterById(id)).use { cursor ->
                if (cursor == null || !cursor.moveToFirst()) return "failed,0,0"
                val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
                val got = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
                val total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
                val state = when (status) { DownloadManager.STATUS_SUCCESSFUL -> "complete"; DownloadManager.STATUS_FAILED -> "failed"; else -> "active" }
                "$state,$got,$total"
            }
        } catch (_: Exception) { "failed,0,0" }

        @JavascriptInterface fun share(title: String, text: String, url: String) {
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"; putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, listOf(text, url).filter { it.isNotBlank() }.joinToString("\n"))
                }
                startActivity(Intent.createChooser(send, "Share Booru Post"))
            }
        }
    }

    override fun onDestroy() { if (::webView.isInitialized) webView.destroy(); super.onDestroy() }
}