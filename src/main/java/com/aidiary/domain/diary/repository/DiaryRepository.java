package com.aidiary.domain.diary.repository;

import com.aidiary.domain.diary.entity.Diary;
import com.aidiary.domain.emotion.entity.Emotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

import java.util.Optional;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    Page<Diary> findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long userId,
            Pageable pageable
    );

    Optional<Diary> findByIdAndUserIdAndDeletedAtIsNull(
            Long diaryId,
            Long userId
    );

    @Query("""
            select d
            from Diary d
            where d.user.id = :userId
              and d.deletedAt is null
              and (
                    :keyword is null
                    or :keyword = ''
                    or lower(d.title) like lower(concat('%', :keyword, '%'))
                    or lower(d.content) like lower(concat('%', :keyword, '%'))
              )
              and (
                    :emotion is null
                    or exists (
                        select ea
                        from EmotionAnalysis ea
                        where ea.diary = d
                          and ea.emotion = :emotion
                          and ea.createdAt = (
                              select max(latest.createdAt)
                              from EmotionAnalysis latest
                              where latest.diary = d
                          )
                    )
              )
            order by d.createdAt desc
            """)
    Page<Diary> search(
            @Param("userId") Long userId,
            @Param("keyword") String keyword,
            @Param("emotion") Emotion emotion,
            Pageable pageable
    );
    @Query("""
        select d.createdAt
        from Diary d
        where d.user.id = :userId
          and d.deletedAt is null
        order by d.createdAt desc
        """)
    List<LocalDateTime> findCreatedAtByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            @Param("userId") Long userId
    );
    List<Diary> findByUserIdAndDeletedAtIsNullAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            Long userId,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime
    );
}