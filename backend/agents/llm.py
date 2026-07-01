"""Shared LLM helper with trace logging."""

import time
from backend.config import QWEN_API_URL, QWEN_MODEL, QWEN_API_KEY


def call_llm(prompt: str, max_tokens: int = 512, temperature: float = 0.3) -> dict:
    """Call LLM and return both the response and a trace log."""
    trace = {
        "prompt": prompt,
        "model": QWEN_MODEL,
        "max_tokens": max_tokens,
        "response": "",
        "duration_ms": 0,
        "success": False,
    }

    start = time.perf_counter()
    try:
        from openai import OpenAI

        client = OpenAI(base_url=QWEN_API_URL, api_key=QWEN_API_KEY)
        resp = client.chat.completions.create(
            model=QWEN_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        text = resp.choices[0].message.content or ""
        elapsed = (time.perf_counter() - start) * 1000

        trace["response"] = text
        trace["duration_ms"] = round(elapsed)
        trace["success"] = True
        return trace
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        trace["duration_ms"] = round(elapsed)
        trace["error"] = str(e)
        return trace
