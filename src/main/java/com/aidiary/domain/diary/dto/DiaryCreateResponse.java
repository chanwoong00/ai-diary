package com.aidiary.domain.diary.dto;

import java.time.LocalDateTime;

public record DiaryCreateResponse(
        Long id,
        String title,
        String content,
        LocalDateTime createdAt
) {
}