package com.aidiary.domain.emotion.repository;

import com.aidiary.domain.emotion.entity.EmotionAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface EmotionAnalysisRepository
        extends JpaRepository<EmotionAnalysis, Long> {

    Optional<EmotionAnalysis> findTopByDiaryIdOrderByCreatedAtDesc(
            Long diaryId
    );

    List<EmotionAnalysis> findByDiaryUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(
            Long userId,
            LocalDateTime startDateTime
    );
}