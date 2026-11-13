package hr.triviatavern.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Insets;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import android.webkit.WebMessage;
import android.webkit.WebMessagePort;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Locale;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String HOME = "https://mateok51.github.io/mozgalica/";
    private static final Uri ORIGIN = Uri.parse("https://mateok51.github.io");
    private WebView web;
    private WebMessagePort nativePort;
    private boolean resumed;
    private long lastHaptic;
    private AlertDialog exitDialog;
    private long lastShare;
    private boolean sharing;

    private boolean local(Uri u) {
        return "https".equals(u.getScheme()) && "mateok51.github.io".equals(u.getHost())
            && (u.getPort() == -1 || u.getPort() == 443) && u.getUserInfo() == null
            && u.getPath() != null && u.getPath().startsWith("/mozgalica/");
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xff1a0e08);
        setContentView(web);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            web.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if (!r.isForMainFrame()) return true;
                if (local(r.getUrl()) && (r.getUrl().getPath().equals("/mozgalica/")
                    || r.getUrl().getPath().equals("/mozgalica/index.html"))) return false;
                if ("https".equals(r.getUrl().getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); }
                    catch (ActivityNotFoundException ignored) {}
                }
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (!local(u)) return null;
                String path = u.getPath().substring("/mozgalica/".length());
                if (path.isEmpty()) path = "index.html";
                if (path.contains("..") || path.indexOf('\\') >= 0 || path.indexOf('\0') >= 0) return missing();
                String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
                if (ext.equals("js")) mime = "application/javascript";
                if (ext.equals("webmanifest")) mime = "application/manifest+json";
                try {
                    return new WebResourceResponse(mime == null ? "application/octet-stream" : mime,
                        "UTF-8", getAssets().open("game/" + path));
                } catch (IOException e) { return missing(); }
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                closePort();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!local(Uri.parse(url)) || nativePort != null) return;
                WebMessagePort[] channel = web.createWebMessageChannel();
                nativePort = channel[0];
                nativePort.setWebMessageCallback(new WebMessagePort.WebMessageCallback() {
                    @Override public void onMessage(WebMessagePort port, WebMessage message) {
                        if (port != nativePort || !resumed) return;
                        handleMessage(message.getData());
                    }
                });
                // Transfer a capability with a fixed vocabulary, never a general Java bridge.
                web.postWebMessage(new WebMessage("trivia-native-connect", new WebMessagePort[]{channel[1]}), ORIGIN);
                immersive();
            }
        });
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::confirmExit);
        }
        web.loadUrl(HOME);
    }
    private WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void handleMessage(String message) {
        if (message == null || message.length() > 40000) return;
        if (!message.startsWith("{")) { haptic(message); return; }
        if (!NativePayloads.boundedJson(message, 40000, 3) || !hasWindowFocus()) return;
        String reply = "share-failed";
        try {
            JSONObject action = new JSONObject(message);
            String type = action.getString("type"), text, subject;
            if ("share-invite".equals(type)) {
                text = action.getString("url");
                if (!NativePayloads.invitation(text)) { notifyPage(reply); return; }
                subject = "Trivia Tavern — pozivnica";
            } else if ("export-diagnostics".equals(type)) {
                reply = "diagnostics-failed";
                text = NativePayloads.diagnostics(action.getString("report"));
                if (text == null) { notifyPage(reply); return; }
                subject = "Trivia Tavern — dijagnostika";
            } else { return; }
            if (sharing || SystemClock.uptimeMillis() - lastShare < 1000) { notifyPage(reply); return; }
            Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_SUBJECT, subject).putExtra(Intent.EXTRA_TEXT, text);
            lastShare = SystemClock.uptimeMillis(); sharing = true;
            startActivityForResult(Intent.createChooser(send, subject), 78);
            notifyPage("export-diagnostics".equals(type) ? "diagnostics-opened" : "share-opened");
        } catch (Exception ignored) { sharing = false; notifyPage(reply); }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 78) sharing = false;
    }
    private void haptic(String kind) {
        if (kind == null || kind.length() > 16 || SystemClock.uptimeMillis() - lastHaptic < 60) return;
        int effect;
        switch (kind) {
            case "tap": case "step": effect = HapticFeedbackConstants.CLOCK_TICK; break;
            case "confirm": effect = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.KEYBOARD_TAP; break;
            case "error": case "bomb": effect = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS; break;
            case "impact": case "victory": effect = HapticFeedbackConstants.LONG_PRESS; break;
            default: return;
        }
        lastHaptic = SystemClock.uptimeMillis();
        web.performHapticFeedback(effect); // Honors system feedback settings; no VIBRATE permission.
    }
    private void notifyPage(String event) {
        if (nativePort != null) try { nativePort.postMessage(new WebMessage(event)); }
        catch (IllegalStateException ignored) {}
    }
    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c != null) {
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsets.Type.systemBars());
            }
        } else {
            web.setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused && web != null) { immersive(); if (resumed) notifyPage("resume"); }
    }
    @Override protected void onPause() {
        notifyPage("pause");
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        web.onPause(); resumed = false; super.onPause();
    }
    @Override protected void onResume() {
        super.onResume(); resumed = true;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (web != null) { web.onResume(); immersive(); notifyPage("resume"); }
    }
    @Override public void onBackPressed() { confirmExit(); }
    private void confirmExit() {
        if (exitDialog != null && exitDialog.isShowing()) return;
        exitDialog = new AlertDialog.Builder(this).setMessage("Želiš napustiti igru?")
            .setPositiveButton("Izađi", (d, w) -> { notifyPage("pause"); finish(); })
            .setNegativeButton("Nastavi igrati", null).show();
    }
    private void closePort() {
        if (nativePort != null) { nativePort.close(); nativePort = null; }
    }
    @Override protected void onDestroy() {
        closePort(); web.destroy(); super.onDestroy();
    }
}
