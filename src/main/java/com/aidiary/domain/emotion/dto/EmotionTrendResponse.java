package com.aidiary.domain.emotion.dto;

import java.util.List;

public record EmotionTrendResponse(
        int days,
        List<EmotionTrendItemResponse> trends
) {
}