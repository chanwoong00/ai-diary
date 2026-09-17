package com.aidiary.domain.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DiaryCreateRequest(

        @Size(max = 255, message = "제목은 255자 이하여야 합니다.")
        String title,

        @NotBlank(message = "일기 내용은 필수입니다.")
        @Size(max = 10000, message = "일기 내용은 10,000자 이하여야 합니다.")
        String content
) {
}