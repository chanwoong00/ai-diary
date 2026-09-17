package com.aidiary.domain.diary.dto;

import java.time.LocalDateTime;

public record DiaryDetailResponse(
        Long id,
        String title,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}