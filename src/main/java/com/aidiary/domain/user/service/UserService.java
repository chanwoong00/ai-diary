package com.aidiary.domain.user.service;

import com.aidiary.domain.user.dto.LoginRequest;
import com.aidiary.domain.user.dto.LoginResponse;
import com.aidiary.domain.user.dto.SignupRequest;
import com.aidiary.domain.user.dto.SignupResponse;
import com.aidiary.domain.user.entity.User;
import com.aidiary.domain.user.repository.UserRepository;
import com.aidiary.global.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    public SignupResponse signup(SignupRequest request) {

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        if (userRepository.existsByNickname(request.getNickname())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());

        User user = new User(
                request.getEmail(),
                passwordHash,
                request.getNickname()
        );

        User savedUser = userRepository.save(user);

        String accessToken = jwtProvider.createAccessToken(
                savedUser.getId(),
                savedUser.getEmail()
        );

        return new SignupResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getNickname(),
                savedUser.getCreatedAt(),
                accessToken
        );
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException(
                        "이메일 또는 비밀번호가 올바르지 않습니다."
                ));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException(
                    "이메일 또는 비밀번호가 올바르지 않습니다."
            );
        }

        String accessToken = jwtProvider.createAccessToken(
                user.getId(),
                user.getEmail()
        );

        return new LoginResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                accessToken
        );
    }
}