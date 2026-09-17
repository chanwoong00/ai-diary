package com.aidiary.integration;

import org.junit.jupiter.api.Test;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 찬웅의 FastAPI 감정분석 서버(gemini-experiment/app.py)가 로컬에서 떠 있는 상태에서
 * (uvicorn app:app --port 8000) 실행하는 수동 연동 테스트.
 * Spring 컨텍스트/DB 없이 순수 HTTP 호출만으로 POST /analyze 계약을 검증한다.
 * (Jackson이 test 클래스패스에 안 잡혀 있어서 정규식으로 간단히 파싱함 — 실제 서비스 코드에서는
 * ObjectMapper 써도 됨.)
 */
class GeminiAnalyzeIntegrationTest {

    private static final String ANALYZE_URL = "http://127.0.0.1:8000/analyze";

    @Test
    void analyzeEndpoint_returnsValidEmotionSchema() throws Exception {
        // 한글 리터럴은 플랫폼 기본 소스 인코딩에 따라 컴파일 시 깨질 수 있어 영어로 작성 (analyze.py는 다국어 입력을 지원함)
        String diaryText = "Today I finally finished my team project presentation. I was nervous for days, but I feel relieved now.";
        String requestBody = "{\"diary_text\": \"" + diaryText + "\"}";

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
        int score = Integer.parseInt(extract(body, "\"score\"\\s*:\\s*(\\d+)"));
        String feedback = extract(body, "\"feedback\"\\s*:\\s*\"(.*)\"\\s*}\\s*$");

        // 감정 라벨 5종 자체가 한글이라, 정확한 문자열 비교 대신 "비어있지 않고 짧은 라벨"인지만 확인
        // (라벨이 정확히 5종 안에서 나오는지는 gemini-experiment/test_samples.py에서 이미 검증함)
        assertTrue(emotion != null && !emotion.isBlank() && emotion.length() <= 10);
        assertTrue(score >= 1 && score <= 5);
        assertTrue(feedback != null && !feedback.isBlank());

        System.out.println("emotion=" + emotion + " score=" + score + " feedback=" + feedback);
    }

    private static String extract(String body, String regex) {
        Matcher m = Pattern.compile(regex).matcher(body);
        return m.find() ? m.group(1) : null;
    }
}
