package com.aidiary.domain.emotion.dto;

import com.aidiary.domain.emotion.entity.Emotion;

import java.time.LocalDate;
import java.util.Map;

public record EmotionTrendItemResponse(
        LocalDate date,
        Map<Emotion, Double> scores
) {
}