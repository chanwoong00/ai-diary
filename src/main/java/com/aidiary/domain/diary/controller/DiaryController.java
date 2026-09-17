package com.aidiary.domain.diary.controller;

import com.aidiary.domain.diary.dto.DiaryCreateRequest;
import com.aidiary.domain.diary.dto.DiaryCreateResponse;
import com.aidiary.domain.diary.dto.DiaryListResponse;
import com.aidiary.domain.diary.service.DiaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.aidiary.domain.diary.dto.DiaryDetailResponse;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.DeleteMapping;

@RestController
@RequestMapping("/api/diaries")
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;

    @PostMapping
    public ResponseEntity<DiaryCreateResponse> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody DiaryCreateRequest request
    ) {
        DiaryCreateResponse response = diaryService.create(
                userId,
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<DiaryListResponse> findAll(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);

        DiaryListResponse response = diaryService.findAll(
                userId,
                safePage,
                safeSize
        );

        return ResponseEntity.ok(response);
    }
    @GetMapping("/{diaryId}")
    public ResponseEntity<DiaryDetailResponse> findById(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long diaryId
    ) {
        DiaryDetailResponse response = diaryService.findById(
                userId,
                diaryId
        );

        return ResponseEntity.ok(response);
    }
    @DeleteMapping("/{diaryId}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long diaryId
    ) {
        diaryService.delete(userId, diaryId);

        return ResponseEntity.noContent().build();
    }
}