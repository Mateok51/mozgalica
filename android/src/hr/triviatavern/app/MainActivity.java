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
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.os.VibrationAttributes;
import android.media.AudioAttributes;
import android.provider.Settings;
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
    private AlertDialog invitationDialog;
    private String pendingInvitation;
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
                if ("about:blank".equals(url) && pendingInvitation != null) {
                    String invitation = pendingInvitation;
                    pendingInvitation = null;
                    web.loadUrl(invitation);
                    return;
                }
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
        String invitation = incomingInvitation(getIntent());
        web.loadUrl(invitation == null ? HOME : invitation);
    }
    private String incomingInvitation(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return null;
        return NativePayloads.incomingInvitation(intent.getDataString());
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        final String invitation = incomingInvitation(intent);
        if (invitation == null || web == null || isFinishing()) return;
        // The page keeps the invitation hash until leaving that room. Do not reload a duplicate.
        if (invitation.equals(NativePayloads.incomingInvitation(web.getUrl()))) return;
        if (invitationDialog != null && invitationDialog.isShowing()) return;
        invitationDialog = new AlertDialog.Builder(this)
            .setTitle("Otvori pozivnicu")
            .setMessage("Otvoriti pozivnicu za sobu " + Uri.parse(invitation).getFragment().substring(0, 4)
                + "? Ako si već u igri, napustit ćeš je.")
            .setPositiveButton("Otvori", (d, w) -> {
                setIntent(new Intent(Intent.ACTION_VIEW, Uri.parse(invitation)));
                // A hash-only navigation would not rerun the game's startup/join parser.
                pendingInvitation = invitation;
                web.loadUrl("about:blank");
            })
            .setNegativeButton("Ostani ovdje", null).show();
    }
    private WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void handleMessage(String message) {
        if (message == null || message.length() > 40000) return;
        if ("haptic-level:off".equals(message) || "haptic-level:mild".equals(message) || "haptic-level:normal".equals(message)) {
            String level = message.substring("haptic-level:".length());
            getSharedPreferences("device", MODE_PRIVATE).edit().putString("haptic-level", level).apply();
            if ("off".equals(level)) {
                Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (vibrator != null) vibrator.cancel();
            }
            return;
        }
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
        String level = getSharedPreferences("device", MODE_PRIVATE).getString("haptic-level", "mild");
        if ("off".equals(level)) return;
        boolean mild = !"normal".equals(level);
        VibrationEffect effect;
        switch (kind) {
            // Frequent interactions should feel like a light touch, not a game event.
            case "tap": effect = VibrationEffect.createOneShot(mild ? 12 : 20, mild ? 85 : 200); break;
            case "step": effect = VibrationEffect.createOneShot(mild ? 10 : 15, mild ? 65 : 180); break;
            case "confirm": effect = VibrationEffect.createOneShot(mild ? 18 : 30, mild ? 120 : 220); break;
            case "error": effect = VibrationEffect.createWaveform(new long[]{0, 24, 45, 24}, new int[]{0, mild ? 110 : 210, 0, mild ? 110 : 210}, -1); break;
            case "bomb": effect = VibrationEffect.createWaveform(new long[]{0, 35, 35, 55}, new int[]{0, mild ? 140 : 255, 0, mild ? 125 : 230}, -1); break;
            case "impact": effect = VibrationEffect.createOneShot(mild ? 25 : 40, mild ? 125 : 230); break;
            case "victory": effect = VibrationEffect.createWaveform(new long[]{0, 20, 45, 20, 45, 45}, new int[]{0, mild ? 105 : 200, 0, mild ? 105 : 200, 0, mild ? 125 : 230}, -1); break;
            default: return;
        }
        lastHaptic = SystemClock.uptimeMillis();
        // Respect the user's touch-feedback preference instead of forcing vibration on.
        if (Settings.System.getInt(getContentResolver(), Settings.System.HAPTIC_FEEDBACK_ENABLED, 1) == 0) return;
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        try {
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= 33) {
                    vibrator.vibrate(effect, new VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_TOUCH).build());
                } else {
                    vibrator.vibrate(effect, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION).build());
                }
            } else web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
        } catch (SecurityException ignored) { web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP); }
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
        if (invitationDialog != null) invitationDialog.dismiss();
        closePort(); web.destroy(); super.onDestroy();
    }
}
