import json
import sys
import time
from collections import Counter

from analyze import analyze_diary

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPEATS = 3
CALL_DELAY_SECONDS = 13  # 무료 티어 분당 5회 제한(gemini-3.7-flash 기준)을 피하기 위한 호출 간격


def _call_with_retry(text: str, max_retries: int = 1) -> dict:
    for attempt in range(max_retries + 1):
        try:
            return analyze_diary(text)
        except Exception as e:
            if "503" in str(e) and attempt < max_retries:
                time.sleep(5)
                continue
            raise

SAMPLES = [
    ("기쁨 예상", "오늘 드디어 원하던 회사에서 합격 통보를 받았다. 몇 달간의 노력이 결실을 맺은 것 같아 정말 뿌듯하고 행복하다."),
    ("슬픔 예상", "오랫동안 키우던 강아지가 오늘 무지개다리를 건넜다. 집이 텅 빈 것 같고 자꾸 눈물이 난다."),
    ("분노 예상", "팀 프로젝트에서 내가 다 한 작업을 팀원이 혼자 한 것처럼 발표했다. 너무 화가 나서 잠이 안 온다."),
    ("불안 예상", "내일 중요한 면접이 있는데 준비가 부족한 것 같아 계속 초조하다. 잠도 잘 못 잘 것 같다."),
    ("평온 예상", "주말 아침에 여유롭게 커피를 마시며 책을 읽었다. 아무 일정도 없이 조용한 시간을 보내니 마음이 편안하다."),
    ("복합/모호", "오늘은 특별한 일 없이 그냥 그런 하루였다. 회사 갔다가 집에 와서 밥 먹고 잤다."),
]


def run() -> None:
    total_calls = 0
    total_success = 0
    failures = []

    for label, text in SAMPLES:
        print(f"=== {label} ===")
        print(text)
        emotion_counts = Counter()

        for i in range(1, REPEATS + 1):
            total_calls += 1
            try:
                result = _call_with_retry(text)
                emotion_counts[result["emotion"]] += 1
                total_success += 1
                print(f"  [{i}] {json.dumps(result, ensure_ascii=False)}")
            except Exception as e:
                failures.append((label, i, e))
                print(f"  [{i}] 실패: {type(e).__name__}: {e}")
            time.sleep(CALL_DELAY_SECONDS)

        print(f"  -> 라벨 분포: {dict(emotion_counts)}")
        print()

    print("=" * 40)
    rate = total_success / total_calls if total_calls else 0
    print(f"총 {total_calls}회 호출 중 {total_success}회 성공 ({rate:.0%})")
    if failures:
        print("실패 상세:")
        for label, i, e in failures:
            print(f"  - {label} #{i}: {e}")


if __name__ == "__main__":
    run()
