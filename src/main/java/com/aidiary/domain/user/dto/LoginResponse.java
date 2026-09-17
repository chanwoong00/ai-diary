package com.aidiary.domain.user.dto;

public record LoginResponse(
        Long id,
        String email,
        String nickname,
        String accessToken
) {
}