from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from google import genai
from typing import List
from fastapi.responses import StreamingResponse
import asyncio
# Load environment variables
load_dotenv()

gemini_api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=gemini_api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow frontend to access API
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Request schema
class QueryRequest(BaseModel):
    user_input: str
    book: str
class ChatHistoryItem(BaseModel):
    text: str
    sender: str

class SuggestPromptsRequest(BaseModel):
    chat_history: List[ChatHistoryItem]
    book: str


# Define a prompt template
PROMPT_TEMPLATE = """
You are an expert in books and literature.
Answer the following query in a helpful and informative way for the book or the ISBN code: {book}:
Make sure to include emojis, and be creative and engaging in your response.

User query: {user_input}
"""

from fastapi.responses import StreamingResponse
import asyncio

@app.post("/chat")
async def chat_with_book(request: QueryRequest):
    try:
        prompt = PROMPT_TEMPLATE.format(book=request.book, user_input=request.user_input)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        # Simulate streaming by sending chunks of the response
        async def generate():
            for chunk in response.text.split("\n"):  # Split response by newlines
                yield f"{chunk}\n"  # Send each line as a chunk
                # print(f"x{chunk}\n\n")
                await asyncio.sleep(0.3)  # Add a small delay for realism


        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

PROMPT_TEMPLATE_SUGGESTION = """
You are an expert in books and literature. You are here as a book assistant. The user will insert a book name, and your job is to suggest 4 prompts that a user might ask .
Suggest exactly 4 brief, simple, distinct and engaging prompts related to the book: {book}.
Only output the 4 prompts, separated by semicolons only dont put a space after semi colon, without any extra text.

Example Output:
[First prompt];[Second prompt];[Third prompt];[Fourth prompt]

Example book = Napoleon:
What were Napoleon's greatest military blunders?;How did the French Revolution shape Napoleon's rise to power?;What was the impact of the Napoleonic Code?;How did Napoleon's reign affect the balance of power in Europe?
"""

@app.post("/suggest-prompts")
async def suggest_prompts(request: SuggestPromptsRequest):
    try:
        # Create a prompt for the LLM to generate suggested prompts
        prompt = PROMPT_TEMPLATE_SUGGESTION.format(book=request.book)
        
        # Optionally, include the chat history in the prompt for context
        if request.chat_history:
            chat_history_context = "\n".join([f"{msg.sender}: {msg.text}" for msg in request.chat_history])
            prompt += f"\n\nChat History:\n{chat_history_context}"
        
        # Ask the LLM to generate suggested prompts
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )
        
        generated_prompts = response.text.strip().split(";")
        suggested_prompts = [prompt.strip() for prompt in generated_prompts[:4]]

        
        return {"suggested_prompts": suggested_prompts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")