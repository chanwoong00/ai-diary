package com.aidiary.domain.emotion.repository;

import com.aidiary.domain.emotion.entity.EmotionAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmotionAnalysisRepository
        extends JpaRepository<EmotionAnalysis, Long> {

    Optional<EmotionAnalysis> findTopByDiaryIdOrderByCreatedAtDesc(
            Long diaryId
    );
}