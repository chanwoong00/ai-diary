package com.aidiary.domain.emotion.service;

import com.aidiary.domain.diary.entity.Diary;
import com.aidiary.domain.diary.repository.DiaryRepository;
import com.aidiary.domain.emotion.dto.EmotionAnalysisResponse;
import com.aidiary.domain.emotion.dto.EmotionTrendItemResponse;
import com.aidiary.domain.emotion.dto.EmotionTrendResponse;
import com.aidiary.domain.emotion.entity.Emotion;
import com.aidiary.domain.emotion.entity.EmotionAnalysis;
import com.aidiary.domain.emotion.repository.EmotionAnalysisRepository;
import com.aidiary.global.exception.ResourceNotFoundException;
import com.aidiary.global.gemini.GeminiClient;
import com.aidiary.global.gemini.dto.GeminiAnalyzeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

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
                geminiResponse.scores(),
                geminiResponse.feedback()
        );

        EmotionAnalysis savedAnalysis =
                emotionAnalysisRepository.save(emotionAnalysis);

        return toResponse(savedAnalysis);
    }

    @Transactional(readOnly = true)
    public EmotionAnalysisResponse getLatestAnalysis(
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

        EmotionAnalysis emotionAnalysis = emotionAnalysisRepository
                .findTopByDiaryIdOrderByCreatedAtDesc(diary.getId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "감정 분석 결과를 찾을 수 없습니다."
                        )
                );

        return toResponse(emotionAnalysis);
    }

    @Transactional(readOnly = true)
    public EmotionTrendResponse getTrends(
            Long userId,
            int days
    ) {
        LocalDate startDate = LocalDate.now().minusDays(days - 1);
        LocalDateTime startDateTime = startDate.atStartOfDay();

        List<EmotionAnalysis> analyses = emotionAnalysisRepository
                .findByDiaryUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
                        userId,
                        startDateTime
                );

        List<EmotionAnalysis> latestAnalyses = keepLatestAnalysisPerDiary(
                analyses
        );

        List<EmotionTrendItemResponse> trends = new ArrayList<>();

        for (int dayOffset = 0; dayOffset < days; dayOffset++) {
            LocalDate date = startDate.plusDays(dayOffset);

            List<EmotionAnalysis> dailyAnalyses = latestAnalyses.stream()
                    .filter(analysis ->
                            analysis.getCreatedAt()
                                    .toLocalDate()
                                    .equals(date)
                    )
                    .toList();

            trends.add(new EmotionTrendItemResponse(
                    date,
                    calculateAverageScores(dailyAnalyses)
            ));
        }

        return new EmotionTrendResponse(days, trends);
    }

    private List<EmotionAnalysis> keepLatestAnalysisPerDiary(
            List<EmotionAnalysis> analyses
    ) {
        Set<Long> diaryIds = new HashSet<>();
        List<EmotionAnalysis> latestAnalyses = new ArrayList<>();

        for (EmotionAnalysis analysis : analyses) {
            Long diaryId = analysis.getDiary().getId();

            if (diaryIds.add(diaryId)) {
                latestAnalyses.add(analysis);
            }
        }

        return latestAnalyses;
    }

    private Map<Emotion, Double> calculateAverageScores(
            List<EmotionAnalysis> analyses
    ) {
        Map<Emotion, Double> averageScores = new EnumMap<>(Emotion.class);

        for (Emotion emotion : Emotion.values()) {
            double average = analyses.stream()
                    .mapToInt(analysis -> toScores(analysis).get(emotion))
                    .average()
                    .orElse(0.0);

            averageScores.put(emotion, Math.round(average * 10) / 10.0);
        }

        return averageScores;
    }

    private EmotionAnalysisResponse toResponse(
            EmotionAnalysis emotionAnalysis
    ) {
        return new EmotionAnalysisResponse(
                emotionAnalysis.getId(),
                emotionAnalysis.getDiary().getId(),
                emotionAnalysis.getSource(),
                emotionAnalysis.getEmotion(),
                emotionAnalysis.getIntensity(),
                toScores(emotionAnalysis),
                emotionAnalysis.getFeedback(),
                emotionAnalysis.getCreatedAt()
        );
    }

    private Map<Emotion, Integer> toScores(
            EmotionAnalysis emotionAnalysis
    ) {
        Map<Emotion, Integer> scores = new EnumMap<>(Emotion.class);

        scores.put(Emotion.JOY, scoreOrZero(emotionAnalysis.getJoyScore()));
        scores.put(Emotion.SADNESS, scoreOrZero(emotionAnalysis.getSadnessScore()));
        scores.put(Emotion.ANGER, scoreOrZero(emotionAnalysis.getAngerScore()));
        scores.put(Emotion.ANXIETY, scoreOrZero(emotionAnalysis.getAnxietyScore()));
        scores.put(Emotion.CALM, scoreOrZero(emotionAnalysis.getCalmScore()));

        if (scores.values().stream().allMatch(score -> score == 0)) {
            scores.put(
                    emotionAnalysis.getEmotion(),
                    emotionAnalysis.getIntensity()
            );
        }

        return scores;
    }

    private int scoreOrZero(Integer score) {
        return score == null ? 0 : score;
    }
}