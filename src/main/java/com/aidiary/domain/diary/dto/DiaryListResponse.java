package com.aidiary.domain.diary.dto;

import java.util.List;

public record DiaryListResponse(
        List<DiarySummaryResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {
}