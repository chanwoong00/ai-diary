package com.aidiary.integration;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * 찬웅의 FastAPI 감정분석 서버(gemini-experiment/app.py)가 로컬에서 떠 있을 때
 * (cd gemini-experiment && python -m uvicorn app:app --port 8000) POST /analyze 계약을 검증하는 연동 테스트.
 * 서버가 안 떠 있으면 실패가 아니라 "건너뜀(skipped)" 처리되므로 평소 gradlew test/build는 영향 없음.
 * 서버는 Gradle 입력이 아니라서 결과가 UP-TO-DATE로 재사용될 수 있으니, 다시 돌릴 땐 ./gradlew cleanTest test 사용.
 * Spring 컨텍스트/DB 없이 순수 HTTP 호출만 사용한다.
 * (Jackson이 test 클래스패스에 안 잡혀 있어서 정규식으로 간단히 파싱함 — 실제 서비스 코드에서는
 * ObjectMapper 써도 됨.)
 */
class GeminiAnalyzeIntegrationTest {

    private static final String HOST = "127.0.0.1";
    private static final int PORT = 8000;
    private static final String ANALYZE_URL = "http://" + HOST + ":" + PORT + "/analyze";
    private static final List<String> EMOTIONS = List.of("JOY", "SADNESS", "ANGER", "ANXIETY", "CALM");

    @Test
    void analyzeEndpoint_returnsValidEmotionSchema() throws Exception {
        assumeTrue(isServerUp(), "FastAPI server is not running on " + HOST + ":" + PORT + ", skipping");

        // 한글 리터럴은 플랫폼 기본 소스 인코딩에 따라 컴파일 시 깨질 수 있어 영어로 작성 (analyze.py는 다국어 입력을 지원함)
        String content = "Today I finally finished my team project presentation. I was nervous for days, but I feel relieved now.";
        String requestBody = "{\"content\": \"" + content + "\"}";

        // Java 기본 HttpClient는 HTTP/2 업그레이드(h2c)를 시도하는데, uvicorn이 이때 본문을 못 읽어 422가 나므로 HTTP/1.1로 고정
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(ANALYZE_URL))
                .header("Content-Type", "application/json; charset=utf-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(requestBody.getBytes(StandardCharsets.UTF_8)))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        assertEquals(200, response.statusCode());

        String body = response.body();
        String emotion = extract(body, "\"emotion\"\\s*:\\s*\"([^\"]+)\"");
        int intensity = Integer.parseInt(extract(body, "\"intensity\"\\s*:\\s*(\\d+)"));
        String feedback = extract(body, "\"feedback\"\\s*:\\s*\"(.*)\"\\s*}\\s*$");

        assertTrue(EMOTIONS.contains(emotion), "unexpected emotion: " + emotion);
        assertTrue(intensity >= 1 && intensity <= 5, "unexpected intensity: " + intensity);
        assertTrue(feedback != null && !feedback.isBlank());

        System.out.println("emotion=" + emotion + " intensity=" + intensity + " feedback=" + feedback);
    }

    private static boolean isServerUp() {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(HOST, PORT), 500);
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    private static String extract(String body, String regex) {
        Matcher m = Pattern.compile(regex).matcher(body);
        return m.find() ? m.group(1) : null;
    }
}
