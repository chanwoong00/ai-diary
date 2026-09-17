package com.aidiary.domain.diary.service;

import com.aidiary.domain.diary.dto.DiaryCreateRequest;
import com.aidiary.domain.diary.dto.DiaryCreateResponse;
import com.aidiary.domain.diary.dto.DiaryListResponse;
import com.aidiary.domain.diary.dto.DiarySummaryResponse;
import com.aidiary.domain.diary.entity.Diary;
import com.aidiary.domain.diary.repository.DiaryRepository;
import com.aidiary.domain.user.entity.User;
import com.aidiary.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.aidiary.domain.diary.dto.DiaryDetailResponse;
import com.aidiary.global.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final UserRepository userRepository;

    public DiaryCreateResponse create(
            Long userId,
            DiaryCreateRequest request
    ) {
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new IllegalArgumentException("사용자를 찾을 수 없습니다.")
                );

        Diary diary = new Diary(
                user,
                request.title(),
                request.content()
        );

        Diary savedDiary = diaryRepository.save(diary);

        return new DiaryCreateResponse(
                savedDiary.getId(),
                savedDiary.getTitle(),
                savedDiary.getContent(),
                savedDiary.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public DiaryListResponse findAll(
            Long userId,
            int page,
            int size
    ) {
        Page<Diary> diaryPage =
                diaryRepository.findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                        userId,
                        PageRequest.of(page, size)
                );

        List<DiarySummaryResponse> content = diaryPage.getContent()
                .stream()
                .map(diary -> new DiarySummaryResponse(
                        diary.getId(),
                        diary.getTitle(),
                        diary.getCreatedAt()
                ))
                .toList();

        return new DiaryListResponse(
                content,
                diaryPage.getNumber(),
                diaryPage.getSize(),
                diaryPage.getTotalElements(),
                diaryPage.getTotalPages(),
                diaryPage.hasNext()
        );
    }
    @Transactional(readOnly = true)
    public DiaryDetailResponse findById(
            Long userId,
            Long diaryId
    ) {
        Diary diary = diaryRepository
                .findByIdAndUserIdAndDeletedAtIsNull(diaryId, userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("일기를 찾을 수 없습니다.")
                );

        return new DiaryDetailResponse(
                diary.getId(),
                diary.getTitle(),
                diary.getContent(),
                diary.getCreatedAt(),
                diary.getUpdatedAt()
        );

    }
    public void delete(
            Long userId,
            Long diaryId
    ) {
        Diary diary = diaryRepository
                .findByIdAndUserIdAndDeletedAtIsNull(diaryId, userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("일기를 찾을 수 없습니다.")
                );

        diary.delete();
    }
}