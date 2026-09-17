package com.aidiary.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class SignupResponse {

    private Long id;
    private String email;
    private String nickname;
    private LocalDateTime createdAt;
    private String accessToken;
}
