package com.aidiary.domain.emotion.dto;

import com.aidiary.domain.emotion.entity.Emotion;

import java.time.LocalDateTime;
import java.util.Map;

public record EmotionAnalysisResponse(
        Long id,
        Long diaryId,
        String source,
        Emotion emotion,
        Integer intensity,
        Map<Emotion, Integer> scores,
        String feedback,
        LocalDateTime createdAt
) {
}
