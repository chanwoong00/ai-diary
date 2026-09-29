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

    @Column(columnDefinition = "TEXT", nullable = false)
    private String feedback;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public EmotionAnalysis(
            Diary diary,
            String source,
            Emotion emotion,
            Integer intensity,
            String feedback
    ) {
        this.diary = diary;
        this.source = source;
        this.emotion = emotion;
        this.intensity = intensity;
        this.feedback = feedback;
    }

    @PrePersist
    private void setCreatedAt() {
        this.createdAt = LocalDateTime.now();
    }
}