package com.aidiary.global.gemini.dto;

import com.aidiary.domain.emotion.entity.Emotion;

public record GeminiAnalyzeResponse(
        Emotion emotion,
        Integer intensity,
        String feedback
) {
}