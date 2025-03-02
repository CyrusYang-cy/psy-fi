from fastapi import FastAPI, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from dotenv import load_dotenv
import os
from typing import List, Dict, Optional, Union
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

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

# Get DEEPSEEK API KEY from environment variables
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com"

# Initialize OpenAI client with DeepSeek configuration
client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_URL)

# Define request models


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = "deepseek-chat"
    messages: List[Message]
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class FinancialAssistantRequest(BaseModel):
    emotion: str
    purchase_history: str


@app.post("/chat/completions")
async def chat_completions(request: ChatRequest):
    """
    Endpoint to proxy requests to DeepSeek API
    """
    try:
        # Convert Pydantic model to dict for the request
        payload = request.dict(exclude_none=True)

        # Create messages in the format expected by OpenAI client
        messages = [{"role": msg.role, "content": msg.content}
                    for msg in request.messages]

        # Make the API call using OpenAI client
        response = client.chat.completions.create(
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            top_p=request.top_p,
            max_tokens=request.max_tokens,
            stream=request.stream
        )

        # Convert the response to a dictionary
        return response.model_dump()
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calling DeepSeek API: {str(e)}")


@app.get("/")
async def root():
    """
    Root endpoint to check if the server is running
    """
    return {"message": "DeepSeek API Proxy is running. Use /chat/completions endpoint for chat completions."}


@app.post("/financial-assistant")
async def financial_assistant(request: Request):
    """
    Endpoint for financial assistant functionality
    Handles both JSON body and query parameters
    """
    # Try to get data from JSON body first
    try:
        json_data = await request.json()
        emotion = json_data.get("emotion", "neutral")
        purchase_history = json_data.get("purchase_history", "")
    except:
        # If JSON parsing fails, try query parameters
        emotion = request.query_params.get("emotion", "neutral")
        purchase_history = request.query_params.get("purchase_history", "")

    prompt = f"""
    You are a financial assistant dedicated to helping users prevent emotional spending.
    The user is currently feeling {emotion} and has recently made these purchases: {purchase_history}.
    Based on this information, provide a thoughtful, actionable suggestion to help the user make mindful financial decisions.
    """

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "You are a helpful financial assistant."},
                {"role": "user", "content": prompt}
            ],
            stream=False
        )

        suggestion = response.choices[0].message.content
        return {"financial_suggestion": suggestion}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error calling DeepSeek API: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
