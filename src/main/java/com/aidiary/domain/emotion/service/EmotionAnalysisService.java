package com.aidiary.domain.emotion.service;

import com.aidiary.domain.diary.entity.Diary;
import com.aidiary.domain.diary.repository.DiaryRepository;
import com.aidiary.domain.emotion.dto.EmotionAnalysisResponse;
import com.aidiary.domain.emotion.entity.EmotionAnalysis;
import com.aidiary.domain.emotion.repository.EmotionAnalysisRepository;
import com.aidiary.global.exception.ResourceNotFoundException;
import com.aidiary.global.gemini.GeminiClient;
import com.aidiary.global.gemini.dto.GeminiAnalyzeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class EmotionAnalysisService {

    private final DiaryRepository diaryRepository;
    private final EmotionAnalysisRepository emotionAnalysisRepository;
    private final GeminiClient geminiClient;

    public EmotionAnalysisResponse analyze(
            Long userId,
            Long diaryId
    ) {
        Diary diary = diaryRepository
                .findByIdAndUserIdAndDeletedAtIsNull(diaryId, userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "일기를 찾을 수 없습니다."
                        )
                );

        GeminiAnalyzeResponse geminiResponse = geminiClient.analyze(
                diary.getContent()
        );

        EmotionAnalysis emotionAnalysis = new EmotionAnalysis(
                diary,
                "GEMINI",
                geminiResponse.emotion(),
                geminiResponse.intensity(),
                geminiResponse.feedback()
        );

        EmotionAnalysis savedAnalysis =
                emotionAnalysisRepository.save(emotionAnalysis);

        return new EmotionAnalysisResponse(
                savedAnalysis.getId(),
                diary.getId(),
                savedAnalysis.getSource(),
                savedAnalysis.getEmotion(),
                savedAnalysis.getIntensity(),
                savedAnalysis.getFeedback(),
                savedAnalysis.getCreatedAt()
        );
    }
}