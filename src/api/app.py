from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from google import genai
from typing import List
from fastapi.responses import StreamingResponse
import asyncio
from fastapi.responses import StreamingResponse
import asyncio
import pandas as pd

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
class ChatHistoryItem(BaseModel):
    text: str
    sender: str

class QueryRequest(BaseModel):
    chat_history: List[ChatHistoryItem]
    user_input: str
    book: str

class SuggestPromptsRequest(BaseModel):
    chat_history: List[ChatHistoryItem]
    book: str


# Load the CSV file and create a mapping of book titles to ISBNs


# Load the CSV file into a DataFrame
def load_isbn_mapping(csv_file):
    df = pd.read_csv(csv_file)
    isbn_mapping = df.groupby("Title")["ISBN"].apply(list).to_dict()
    return isbn_mapping

isbn_mapping = str(load_isbn_mapping("source.csv"))

# Define a prompt template
PROMPT_TEMPLATE = """
You are an expert in books and literature with deep knowledge of authors, genres, themes, and literary analysis.  
Your goal is to provide insightful, accurate, and engaging responses to user queries about books or ISBN codes. Follow these guidelines:

1. **Role**: Act as a knowledgeable and friendly literary assistant.
2. **Context**: The user is asking about a specific book or ISBN. Provide detailed information, analysis, or recommendations based on the query.
3. **Output Format**:
   - Start with a brief summary of the book (if applicable).
   - Address the user's query directly and provide a well-structured response.
   - Use bullet points or numbered lists for clarity when appropriate.
   - If the query is vague, ask clarifying questions.
   - **Always format the response in Markdown.**
4. **Constraints**:
   - Be concise but informative.
   - Avoid overly technical jargon unless the user requests it.
   - If you don't know the answer, admit it and suggest where the user might find more information.
   - Do not use any emojis in the response.
5. **Tone and Style**:
   - Use a professional yet conversational tone.
   - Be engaging and encourage further discussion about the book or topic.
6. **Examples**:
   - If the user asks about themes, provide a detailed analysis of the book's themes.
   - If the user asks for recommendations, suggest similar books with brief explanations.
   - If the user asks about an ISBN, verify the book's details and provide relevant information.
7. **Additional information**:
   - Use the following dictionary to map book titles to ISBN codes or vice versa: {isbn_mapping}

**Important: If the user input is not found in the mapping, then answer normally like usual and avoid using the mapping.  
The mapping is optional and should only be used if relevant information is available.**

Now, answer the following query about the book or ISBN code: {book}

User query: {user_input}
"""


@app.post("/chat")
async def chat_with_book(request: QueryRequest):
    try:
        prompt = PROMPT_TEMPLATE.format(book=request.book, user_input=request.user_input, isbn_mapping=isbn_mapping)
        if request.chat_history:
            chat_history_context = "\n".join([f"{msg.sender}: {msg.text}" for msg in request.chat_history])
            prompt += f"\n\nChat History:\n{chat_history_context}"

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt
        )

        # Simulate streaming by sending chunks of the response
        # print(response.text)
        async def generate():
            for chunk in response.text.split("\n"):  # Split response by newlines
                yield f"{chunk}\n"  # Send each line as a chunk
                # print(f"x{chunk}\n\n")
                await asyncio.sleep(0.5)  # Add a small delay for realism


        return StreamingResponse(generate(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")

PROMPT_TEMPLATE_SUGGESTION = """
You are an expert in books and literature with deep knowledge of authors, genres, themes, and literary analysis. 
Your goal is to suggest engaging and relevant prompts for users to ask about a specific book. Follow these guidelines:

1. **Role**: Act as a knowledgeable and friendly book assistant.
2. **Context**: The user will provide a book name, and you must suggest 4 prompts that a user might ask about the book.
3. **Output Format**:
   - Suggest exactly 4 prompts.
   - Each prompt should be brief, simple, distinct, and engaging.
   - Separate the prompts with semicolons (;) without any spaces after the semicolons.
   - Do not include any extra text, explanations, or numbering.
4. **Constraints**:
   - Ensure the prompts are directly related to the book.
   - Avoid overly technical or complex language.
   - Make the prompts open-ended to encourage detailed responses.
   - Do not repeat or rephrase the same idea in multiple prompts.
5. **Tone and Style**:
   - Use a professional yet conversational tone.
   - Make the prompts engaging and thought-provoking.
6. **Examples**:
   - Example book = "1984" by George Orwell:
     - What are the main themes of 1984?;How does the concept of Big Brother reflect modern surveillance?;What is the significance of Newspeak in the novel?;How does Orwell portray the dangers of totalitarianism?
   - Example book = "To Kill a Mockingbird" by Harper Lee:
     - What is the significance of the title "To Kill a Mockingbird"?;How does Atticus Finch embody the idea of moral courage?;What role does Scout's innocence play in the story?;How does the novel address racial injustice?
7. **Additional information**:
   - Use the following dictionary to map ISBN codes to book titles. Make sure to rely on this information first: {isbn_mapping}

**Important: If the user input is not found in the mapping, then answer normally like usual and avoid using the mapping. 
The mapping is optional and should only be used if relevant information is available.**

If the user input is ISBN code, rely on the additional information above to find the book title. 
If the user input is a book title, then proceed with a normal response.
Now, suggest exactly 4 prompts for the book: {book}.
"""

@app.post("/suggest-prompts")
async def suggest_prompts(request: SuggestPromptsRequest):
    try:
        # Create a prompt for the LLM to generate suggested prompts
        prompt = PROMPT_TEMPLATE_SUGGESTION.format(book=request.book, isbn_mapping=isbn_mapping)
        
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