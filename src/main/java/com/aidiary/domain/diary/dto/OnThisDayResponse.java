package com.aidiary.domain.diary.dto;

import java.time.LocalDate;
import java.util.List;

public record OnThisDayResponse(
        LocalDate targetDate,
        List<DiaryDetailResponse> diaries
) {
}