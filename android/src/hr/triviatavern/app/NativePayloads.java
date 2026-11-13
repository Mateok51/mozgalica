package hr.triviatavern.app;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Restricts share capabilities to invitations and anonymous diagnostics. */
public final class NativePayloads {
    private static final Set<String> EVENTS = new HashSet<>(Arrays.asList(
        "connection_lost", "connection_restored", "join_started", "join_failed", "joined",
        "answer_sent", "answer_confirmed", "app_resume", "app_pause", "export"));
    private static final Set<String> PHASES = new HashSet<>(Arrays.asList(
        "lobby", "intro", "deal", "vote", "voteResult", "bet", "power", "cast", "question", "reveal",
        "howto", "sort", "sortReveal", "link", "linkReveal", "order", "orderReveal", "hilo", "hiloReveal",
        "blitz", "blitzReveal", "maj", "majReveal", "uljez", "uljezVote", "uljezReveal", "secret", "secret2",
        "fstart", "fq", "fr", "tstart", "trisk", "rope", "moment", "duelIntro", "duel", "duelResult", "betray", "loyal", "final"));
    public static boolean boundedJson(String text, int maxLength, int maxDepth) {
        if (text == null || text.length() > maxLength) return false;
        int depth = 0; boolean quoted = false, escaped = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (quoted) {
                if (escaped) escaped = false;
                else if (c == '\\') escaped = true;
                else if (c == '"') quoted = false;
            } else if (c == '"') quoted = true;
            else if (c == '{' || c == '[') { if (++depth > maxDepth) return false; }
            else if (c == '}' || c == ']') { if (--depth < 0) return false; }
        }
        return !quoted && depth == 0;
    }
    public static boolean invitation(String value) {
        if (value == null || value.length() > 160) return false;
        try {
            URI u = new URI(value);
            return "https".equals(u.getScheme()) && "mateok51.github.io".equals(u.getHost())
                && u.getUserInfo() == null && (u.getPort() == -1 || u.getPort() == 443)
                && ("/mozgalica/".equals(u.getRawPath()) || "/mozgalica/index.html".equals(u.getRawPath()))
                && u.getRawQuery() == null && u.getRawFragment() != null
                && u.getRawFragment().matches("[A-Z]{4}(?:-[A-Za-z0-9_-]{22})?");
        } catch (Exception e) { return false; }
    }
    private static void keys(JSONObject obj, String... permitted) throws JSONException {
        Set<String> allowed = new HashSet<>(Arrays.asList(permitted));
        Iterator<String> it = obj.keys();
        while (it.hasNext()) if (!allowed.contains(it.next())) throw new JSONException("Unexpected field");
    }
    public static String diagnostics(String text) {
        if (!boundedJson(text, 32768, 5)) return null;
        try {
            JSONObject report = new JSONObject(text);
            keys(report, "format", "webVersion", "environment", "online", "events");
            if (!(report.get("format") instanceof Number) || report.getDouble("format") != 1
                || !"78".equals(report.get("webVersion"))
                || !(report.get("online") instanceof Boolean)
                || !("web".equals(report.get("environment")) || "android".equals(report.get("environment")))) return null;
            JSONArray events = report.getJSONArray("events"), clean = new JSONArray();
            if (events.length() > 80) return null;
            double last = -1;
            for (int i = 0; i < events.length(); i++) {
                JSONObject event = events.getJSONObject(i);
                keys(event, "elapsedMs", "type", "phase");
                Object raw = event.get("elapsedMs"), kind = event.get("type");
                if (!(raw instanceof Number) || !(kind instanceof String) || !EVENTS.contains(kind)) return null;
                double elapsed = ((Number) raw).doubleValue();
                if (Double.isNaN(elapsed) || Double.isInfinite(elapsed) || elapsed < last || elapsed < 0
                    || elapsed > 9007199254740991d || elapsed != Math.floor(elapsed)) return null;
                last = elapsed;
                JSONObject row = new JSONObject().put("elapsedMs", (long) elapsed).put("type", kind);
                if (event.has("phase")) {
                    Object phase = event.get("phase");
                    if (!(phase instanceof String) || !PHASES.contains(phase)) return null;
                    row.put("phase", phase);
                }
                clean.put(row);
            }
            return new JSONObject().put("format", 1).put("webVersion", "78")
                .put("environment", report.get("environment")).put("online", report.get("online"))
                .put("events", clean).toString(2);
        } catch (Exception e) { return null; }
    }
    private NativePayloads() {}
}
