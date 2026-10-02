from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from analyze import analyze_diary

app = FastAPI(title="감정분석 API")

EMOTION_CODES = {
    "기쁨": "JOY",
    "슬픔": "SADNESS",
    "분노": "ANGER",
    "불안": "ANXIETY",
    "평온": "CALM",
}


class AnalyzeRequest(BaseModel):
    content: str = Field(..., min_length=1)


class EmotionScores(BaseModel):
    JOY: int = Field(..., ge=0, le=5)
    SADNESS: int = Field(..., ge=0, le=5)
    ANGER: int = Field(..., ge=0, le=5)
    ANXIETY: int = Field(..., ge=0, le=5)
    CALM: int = Field(..., ge=0, le=5)


class AnalyzeResponse(BaseModel):
    emotion: Literal["JOY", "SADNESS", "ANGER", "ANXIETY", "CALM"]
    intensity: int = Field(..., ge=1, le=5)
    scores: EmotionScores
    feedback: str


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> dict:
    if not request.content.strip():
        raise HTTPException(status_code=400, detail="content가 비어 있습니다.")

    try:
        result = analyze_diary(request.content)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini 분석 실패: {e}")

    return {
        "emotion": EMOTION_CODES[result["emotion"]],
        "intensity": result["score"],
        "scores": {EMOTION_CODES[k]: v for k, v in result["scores"].items()},
        "feedback": result["feedback"],
    }
