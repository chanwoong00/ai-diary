package com.aidiary.global.gemini.dto;

import com.aidiary.domain.emotion.entity.Emotion;

import java.util.Map;

public record GeminiAnalyzeResponse(
        Emotion emotion,
        Integer intensity,
        Map<Emotion, Integer> scores,
        String feedback
) {
}
