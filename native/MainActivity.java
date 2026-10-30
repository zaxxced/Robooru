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

import org.json.JSONArray;
import org.json.JSONObject;

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
        /** Returns the DownloadManager id (> 0) on success, or -1 on failure. */
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

        /**
         * Progress for the given comma-separated download ids, as a JSON array:
         * [{"id":12,"status":2,"downloaded":1048576,"total":2097152}, ...]
         * status: 1 pending, 2 running, 4 paused, 8 successful, 16 failed. total is -1 when unknown.
         * Ids that DownloadManager no longer knows about are simply left out.
         */
        @JavascriptInterface
        public String getDownloadStatus(String idsCsv) {
            JSONArray result = new JSONArray();
            try {
                if (idsCsv == null || idsCsv.trim().isEmpty()) {
                    return result.toString();
                }
                String[] parts = idsCsv.split(",");
                long[] ids = new long[parts.length];
                for (int i = 0; i < parts.length; i++) {
                    ids[i] = Long.parseLong(parts[i].trim());
                }

                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                Cursor c = dm.query(new DownloadManager.Query().setFilterById(ids));
                if (c != null) {
                    try {
                        int idCol = c.getColumnIndex(DownloadManager.COLUMN_ID);
                        int statusCol = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
                        int doneCol = c.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                        int totalCol = c.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                        while (c.moveToNext()) {
                            JSONObject o = new JSONObject();
                            o.put("id", c.getLong(idCol));
                            o.put("status", c.getInt(statusCol));
                            o.put("downloaded", c.getLong(doneCol));
                            o.put("total", c.getLong(totalCol));
                            result.put(o);
                        }
                    } finally {
                        c.close();
                    }
                }
            } catch (Exception e) {
                // fall through with whatever we collected
            }
            return result.toString();
        }
    }
}
