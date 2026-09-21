package com.aidiary.domain.emotion.controller;

import com.aidiary.domain.emotion.dto.EmotionAnalysisResponse;
import com.aidiary.domain.emotion.service.EmotionAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/diaries")
@RequiredArgsConstructor
public class EmotionAnalysisController {

    private final EmotionAnalysisService emotionAnalysisService;

    @PostMapping("/{diaryId}/analyses")
    public ResponseEntity<EmotionAnalysisResponse> analyze(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long diaryId
    ) {
        EmotionAnalysisResponse response =
                emotionAnalysisService.analyze(userId, diaryId);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}