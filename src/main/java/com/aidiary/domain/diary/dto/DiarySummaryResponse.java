package com.aidiary.domain.diary.dto;

import java.time.LocalDateTime;

public record DiarySummaryResponse(
        Long id,
        String title,
        LocalDateTime createdAt
) {
}