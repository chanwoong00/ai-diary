package com.aidiary.domain.emotion.dto;

import com.aidiary.domain.emotion.entity.Emotion;

import java.time.LocalDateTime;

public record EmotionAnalysisResponse(
        Long id,
        Long diaryId,
        String source,
        Emotion emotion,
        Integer intensity,
        String feedback,
        LocalDateTime createdAt
) {
}