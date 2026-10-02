package com.aidiary.domain.emotion.entity;

import com.aidiary.domain.diary.entity.Diary;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "emotion_analyses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmotionAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "diary_id", nullable = false)
    private Diary diary;

    @Column(nullable = false, length = 50)
    private String source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Emotion emotion;

    @Column(nullable = false)
    private Integer intensity;

    @Column(name = "joy_score")
    private Integer joyScore;

    @Column(name = "sadness_score")
    private Integer sadnessScore;

    @Column(name = "anger_score")
    private Integer angerScore;

    @Column(name = "anxiety_score")
    private Integer anxietyScore;

    @Column(name = "calm_score")
    private Integer calmScore;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String feedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public EmotionAnalysis(
            Diary diary,
            String source,
            Emotion emotion,
            Integer intensity,
            Map<Emotion, Integer> scores,
            String feedback
    ) {
        this.diary = diary;
        this.source = source;
        this.emotion = emotion;
        this.intensity = intensity;
        this.joyScore = scores.get(Emotion.JOY);
        this.sadnessScore = scores.get(Emotion.SADNESS);
        this.angerScore = scores.get(Emotion.ANGER);
        this.anxietyScore = scores.get(Emotion.ANXIETY);
        this.calmScore = scores.get(Emotion.CALM);
        this.feedback = feedback;
    }

    @PrePersist
    private void setCreatedAt() {
        this.createdAt = LocalDateTime.now();
    }
}
