package com.aidiary.global.exception;

public record ErrorResponse(
        String code,
        String message
) {
}