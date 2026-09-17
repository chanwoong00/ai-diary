package com.aidiary.domain.diary.repository;

import com.aidiary.domain.diary.entity.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

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
}