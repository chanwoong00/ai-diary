// 분석 실패 시 예외를 발생시켜 프론트에 502

package com.aidiary.global.gemini;

public class GeminiClientException extends RuntimeException {

    public GeminiClientException(String message) {
        super(message);
    }

    public GeminiClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
