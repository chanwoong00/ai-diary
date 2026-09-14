from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from analyze import analyze_diary

app = FastAPI(title="감정분석 API")


class AnalyzeRequest(BaseModel):
    diary_text: str = Field(..., min_length=1)


class AnalyzeResponse(BaseModel):
    emotion: str
    score: int
    feedback: str


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> dict:
    try:
        return analyze_diary(request.diary_text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini 호출 실패: {e}")
