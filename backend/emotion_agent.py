from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import os
from typing import List, Dict, Optional, Union

# Initialize FastAPI app
app = FastAPI(title="DeepSeek API Proxy",
              description="A proxy server for DeepSeek API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# YOUR DEEPSEEK API KEY - Consider using environment variables for security
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-dartesmvj6obpz77")
DEEPSEEK_API_URL = "https://cloud.infini-ai.com/maas/v1/chat/completions"

# Define request models


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "deepseek-r1"
    messages: List[Message]
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


@app.post("/chat/completions")
async def chat_completions(request: ChatRequest):
    """
    Endpoint to proxy requests to DeepSeek API
    """
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    # Convert Pydantic model to dict for the request
    payload = request.dict(exclude_none=True)

    try:
        response = requests.post(
            DEEPSEEK_API_URL, headers=headers, json=payload)
        response.raise_for_status()  # Raise exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error calling DeepSeek API: {str(e)}")


@app.get("/")
async def root():
    """
    Root endpoint to check if the server is running
    """
    return {"message": "DeepSeek API Proxy is running. Use /chat/completions endpoint for chat completions."}

# Example of how to use the financial assistant functionality


@app.post("/financial-assistant")
async def financial_assistant(emotion: str, purchase_history: str):
    """
    Endpoint for financial assistant functionality
    """
    prompt = f"""
    You are a financial assistant dedicated to helping users prevent emotional spending.
    The user is currently feeling {emotion} and has recently made these purchases: {purchase_history}.
    Based on this information, provide a thoughtful, actionable suggestion to help the user make mindful financial decisions.
    """

    data = {
        "model": "deepseek-r1",
        "messages": [
            {"role": "system", "content": "You are a helpful financial assistant."},
            {"role": "user", "content": prompt}
        ],
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data)
        response.raise_for_status()
        suggestion = response.json()["choices"][0]["message"]["content"]
        return {"financial_suggestion": suggestion}
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=500, detail=f"Error calling DeepSeek API: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
