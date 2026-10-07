package com.aidiary.domain.user.dto;

import java.time.LocalDate;

public record StreakResponse(
        int streak,
        LocalDate lastWrittenDate,
        LocalDate startedAt
) {
}