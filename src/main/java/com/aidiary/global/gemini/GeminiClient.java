package com.aidiary.global.gemini;


import com.aidiary.global.gemini.dto.GeminiAnalyzeRequest;
import com.aidiary.global.gemini.dto.GeminiAnalyzeResponse;
import tools.jackson.databind.json.JsonMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
public class GeminiClient {

    private final JsonMapper objectMapper;
    private final HttpClient httpClient;
    private final String baseUrl;

    public GeminiClient(
            JsonMapper objectMapper,
            @Value("${gemini.base-url}") String baseUrl
    ) {
        this.objectMapper = objectMapper;
        this.baseUrl = baseUrl;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public GeminiAnalyzeResponse analyze(String content) {
        try {
            String requestBody = objectMapper.writeValueAsString(
                    new GeminiAnalyzeRequest(content)
            );

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/analyze"))
                    .timeout(Duration.ofSeconds(30))
                    .header(
                            "Content-Type",
                            "application/json; charset=utf-8"
                    )
                    .POST(HttpRequest.BodyPublishers.ofString(
                            requestBody,
                            StandardCharsets.UTF_8
                    ))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(
                            StandardCharsets.UTF_8
                    )
            );

            if (response.statusCode() != 200) {
                throw new GeminiClientException(
                        "감정 분석 서버 요청에 실패했습니다. 상태 코드: "
                                + response.statusCode()
                );
            }

            GeminiAnalyzeResponse analysis = objectMapper.readValue(
                    response.body(),
                    GeminiAnalyzeResponse.class
            );

            validateResponse(analysis);

            return analysis;

        } catch (IOException e) {
            throw new GeminiClientException(
                    "감정 분석 서버와 통신할 수 없습니다.",
                    e
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();

            throw new GeminiClientException(
                    "감정 분석 요청이 중단되었습니다.",
                    e
            );
        }
    }

    private void validateResponse(GeminiAnalyzeResponse analysis) {
        if (analysis.emotion() == null
                || analysis.intensity() == null
                || analysis.intensity() < 1
                || analysis.intensity() > 5
                || analysis.feedback() == null
                || analysis.feedback().isBlank()
                || analysis.feedback().length() > 300) {

            throw new GeminiClientException(
                    "감정 분석 서버의 응답 형식이 올바르지 않습니다."
            );
        }
    }
}