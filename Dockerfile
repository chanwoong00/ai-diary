# 1) Gradle과 JDK 17이 들어 있는 환경에서 백엔드를 빌드한다.
FROM gradle:8.14-jdk17 AS build

WORKDIR /app

COPY build.gradle settings.gradle gradlew ./
COPY gradle gradle
RUN ./gradlew dependencies --no-daemon

COPY src src
RUN ./gradlew bootJar --no-daemon


# 2) 빌드 결과물만 가벼운 Java 실행 환경으로 옮겨 실행한다.
FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]