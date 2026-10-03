package com.aidiary.domain.emotion.controller;

import com.aidiary.domain.emotion.dto.EmotionTrendResponse;
import com.aidiary.domain.emotion.service.EmotionAnalysisService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/emotions")
@RequiredArgsConstructor
@Validated
public class EmotionTrendController {

    private final EmotionAnalysisService emotionAnalysisService;

    @GetMapping("/trends")
    public ResponseEntity<EmotionTrendResponse> getTrends(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "7")
            @Min(1) @Max(30) int days
    ) {
        EmotionTrendResponse response =
                emotionAnalysisService.getTrends(userId, days);

        return ResponseEntity.ok(response);
    }
}