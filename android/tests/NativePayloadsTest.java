import hr.triviatavern.app.NativePayloads;
import org.json.JSONObject;
import org.json.JSONArray;

public class NativePayloadsTest {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) throws Exception {
        String invite = "https://mateok51.github.io/mozgalica/#ABCD-abcdefghijklmnopqrstuv";
        check(NativePayloads.invitation(invite));
        check(NativePayloads.invitation("https://mateok51.github.io/mozgalica/index.html#ABCD"));
        for (String bad : new String[]{"https://evil.test/#ABCD", "javascript:alert(1)",
            "https://mateok51.github.io/mozgalica/?secret=foo#ABCD",
            "https://evil@mateok51.github.io/mozgalica/#ABCD",
            "https://mateok51.github.io/mozgalica/../other/#ABCD", invite + "-extra",
            "https://mateok51.github.io:444/mozgalica/#ABCD", "https://mateok51.github.io/mozgalica/#%41BCD"}) {
            check(!NativePayloads.invitation(bad));
        }
        JSONObject report = new JSONObject().put("format", 1).put("webVersion", "79")
            .put("environment", "android").put("online", true).put("events", new JSONArray()
                .put(new JSONObject().put("elapsedMs", 1).put("type", "answer_sent").put("phase", "question")));
        check(!NativePayloads.boundedJson("[[[[[[[[[[0]]]]]]]]]]", 40000, 3));
        check(NativePayloads.boundedJson("{\"text\":\"[[[[[\"}", 40000, 3));
        String valid = report.toString();
        check(NativePayloads.diagnostics(valid) != null);
        for (String bad : new String[]{"not JSON", new JSONObject(valid).put("room", "PRIVATE").toString(),
            new JSONObject(valid).put("url", invite).toString(), new JSONObject(valid).put("environment", "private-phone").toString(),
            new JSONObject(valid).put("webVersion", "PRIVATE").toString(), new JSONObject(valid).put("online", "true").toString()}) {
            check(NativePayloads.diagnostics(bad) == null);
        }
        for (String key : new String[]{"name", "token", "answer", "url", "room"}) {
            JSONObject bad = new JSONObject(valid);
            bad.getJSONArray("events").getJSONObject(0).put(key, "PRIVATE");
            check(NativePayloads.diagnostics(bad.toString()) == null);
        }
        for (Object badTime : new Object[]{-1, 1.5, "1", 9007199254740992d}) {
            JSONObject bad = new JSONObject(valid); bad.getJSONArray("events").getJSONObject(0).put("elapsedMs", badTime);
            check(NativePayloads.diagnostics(bad.toString()) == null);
        }
        JSONObject tooMany = new JSONObject(valid); JSONArray rows = new JSONArray();
        for (int i = 0; i < 81; i++) rows.put(new JSONObject().put("elapsedMs", i).put("type", "export"));
        tooMany.put("events", rows); check(NativePayloads.diagnostics(tooMany.toString()) == null);
        System.out.println("PASS native invitation allowlist and private-field diagnostics rejection");
    }
}
