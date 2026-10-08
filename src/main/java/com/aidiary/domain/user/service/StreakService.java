package com.aidiary.domain.user.service;

import com.aidiary.domain.diary.repository.DiaryRepository;
import com.aidiary.domain.user.dto.StreakResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StreakService {

    private final DiaryRepository diaryRepository;

    public StreakResponse getStreak(Long userId) {
        List<LocalDate> writtenDates = diaryRepository
                .findCreatedAtByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId)
                .stream()
                .map(LocalDateTime::toLocalDate)
                .distinct()
                .toList();

        if (writtenDates.isEmpty()) {
            return new StreakResponse(0, null, null);
        }

        LocalDate lastWrittenDate = writtenDates.get(0);
        Set<LocalDate> writtenDateSet = new HashSet<>(writtenDates);

        LocalDate cursor;
        LocalDate today = LocalDate.now();

        if (writtenDateSet.contains(today)) {
            cursor = today;
        } else if (writtenDateSet.contains(today.minusDays(1))) {
            cursor = today.minusDays(1);
        } else {
            return new StreakResponse(0, lastWrittenDate, null);
        }

        int streak = 0;

        while (writtenDateSet.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        LocalDate startedAt = cursor.plusDays(1);

        return new StreakResponse(
                streak,
                lastWrittenDate,
                startedAt
        );
    }
}