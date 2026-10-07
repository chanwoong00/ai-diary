package com.aidiary.domain.user.controller;

import com.aidiary.domain.user.dto.StreakResponse;
import com.aidiary.domain.user.service.StreakService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final StreakService streakService;

    @GetMapping("/me/streak")
    public ResponseEntity<StreakResponse> getStreak(
            @AuthenticationPrincipal Long userId
    ) {
        StreakResponse response = streakService.getStreak(userId);

        return ResponseEntity.ok(response);
    }
}