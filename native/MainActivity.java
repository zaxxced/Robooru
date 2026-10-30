package com.example.boorubrowser;

import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

/**
 * Copied over the generated MainActivity by the CI workflow (see .github/workflows/build-apk.yml).
 *
 * 1) Image proxy: every request the WebView makes to *.gelbooru.com (thumbnails, samples, originals,
 *    videos) is streamed natively with a Gelbooru Referer. No base64, no JS bridge, so it is fast.
 * 2) Download bridge: window.BooruNative.download(url, filename) hands the file to Android's
 *    DownloadManager, which saves it into Pictures/Booru (shows in Gallery, needs no storage permission
 *    on Android 10+).
 */
public class MainActivity extends BridgeActivity {

    private static final String REFERER = "https://gelbooru.com/";
    private static final String UA = "Mozilla/5.0 (Linux; Android 14; Mobile) BooruBrowser/1.0";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new DownloadBridge(), "BooruNative");
        webView.setWebViewClient(new BooruWebViewClient(getBridge()));
    }

    private static boolean isGelbooruHost(String host) {
        return host != null && (host.equals("gelbooru.com") || host.endsWith(".gelbooru.com"));
    }

    private static class BooruWebViewClient extends BridgeWebViewClient {

        BooruWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (uri != null
                    && "https".equals(uri.getScheme())
                    && "GET".equalsIgnoreCase(request.getMethod())
                    && isGelbooruHost(uri.getHost())) {
                WebResourceResponse proxied = fetch(uri.toString(), request.getRequestHeaders());
                if (proxied != null) {
                    return proxied;
                }
            }
            return super.shouldInterceptRequest(view, request);
        }

        private WebResourceResponse fetch(String urlStr, Map<String, String> requestHeaders) {
            try {
                HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                conn.setRequestProperty("Referer", REFERER);
                conn.setRequestProperty("User-Agent", UA);
                if (requestHeaders != null) {
                    String range = requestHeaders.get("Range");
                    if (range != null) {
                        conn.setRequestProperty("Range", range);
                    }
                    String accept = requestHeaders.get("Accept");
                    if (accept != null) {
                        conn.setRequestProperty("Accept", accept);
                    }
                }

                int code = conn.getResponseCode();
                // WebResourceResponse rejects 3xx and out-of-range codes; let the WebView handle those itself.
                if (code < 200 || code > 599 || (code >= 300 && code < 400)) {
                    return null;
                }
                InputStream stream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
                if (stream == null) {
                    return null;
                }

                String mime = "application/octet-stream";
                String encoding = null;
                String contentType = conn.getContentType();
                if (contentType != null) {
                    String[] parts = contentType.split(";");
                    mime = parts[0].trim();
                    for (int i = 1; i < parts.length; i++) {
                        String p = parts[i].trim();
                        if (p.toLowerCase().startsWith("charset=")) {
                            encoding = p.substring(8);
                        }
                    }
                }

                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                String contentRange = conn.getHeaderField("Content-Range");
                if (contentRange != null) {
                    headers.put("Content-Range", contentRange);
                }
                String acceptRanges = conn.getHeaderField("Accept-Ranges");
                if (acceptRanges != null) {
                    headers.put("Accept-Ranges", acceptRanges);
                }

                String reason = conn.getResponseMessage();
                if (reason == null || reason.isEmpty()) {
                    reason = "OK";
                }
                return new WebResourceResponse(mime, encoding, code, reason, headers, stream);
            } catch (Exception e) {
                return null;
            }
        }
    }

    private class DownloadBridge {
        @JavascriptInterface
        @SuppressWarnings("deprecation")
        public long download(String url, String filename) {
            try {
                if (url == null || !url.startsWith("https://")) {
                    return -1;
                }
                String safeName = (filename == null || filename.isEmpty())
                        ? "gelbooru_image"
                        : filename.replaceAll("[^A-Za-z0-9._-]", "_");

                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.addRequestHeader("Referer", REFERER);
                request.addRequestHeader("User-Agent", UA);
                request.setTitle(safeName);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_PICTURES, "Booru/" + safeName);
                request.allowScanningByMediaScanner();

                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                return dm.enqueue(request);
            } catch (Exception e) {
                return -1;
            }
        }

        @JavascriptInterface
        public String downloadProgress(long downloadId) {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
            try (Cursor cursor = dm.query(query)) {
                if (cursor == null || !cursor.moveToFirst()) {
                    return "failed,0,0";
                }
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                String state;
                if (status == DownloadManager.STATUS_SUCCESSFUL) state = "complete";
                else if (status == DownloadManager.STATUS_FAILED) state = "failed";
                else state = "active";
                return state + "," + downloaded + "," + total;
            } catch (Exception e) {
                return "failed,0,0";
            }
        }
    }
}
