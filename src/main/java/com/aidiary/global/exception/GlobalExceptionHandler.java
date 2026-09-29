package com.aidiary.global.exception;
import com.aidiary.global.gemini.GeminiClientException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException e
    ) {
        ErrorResponse response = new ErrorResponse(
                "DUPLICATE_EMAIL",
                e.getMessage()
        );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(response);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException e
    ) {
        ErrorResponse response = new ErrorResponse(
                "INVALID_CREDENTIALS",
                "이메일 또는 비밀번호가 올바르지 않습니다."
        );

        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(response);
    }
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException e
    ) {
        ErrorResponse response = new ErrorResponse(
                "RESOURCE_NOT_FOUND",
                e.getMessage()
        );

        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(response);
    }
    @ExceptionHandler(GeminiClientException.class)
    public ResponseEntity<ErrorResponse> handleGeminiClient(
            GeminiClientException e
    ) {
        ErrorResponse response = new ErrorResponse(
                "GEMINI_ANALYSIS_FAILED",
                "감정 분석에 실패했습니다. 잠시 후 다시 시도해주세요."
        );

        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(response);
    }
}