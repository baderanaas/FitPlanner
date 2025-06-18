from fastapi import APIRouter, HTTPException, status, Body
from fastapi.responses import JSONResponse
import json
from pydantic import BaseModel

from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage

from agent_workflow import get_agent
from memory.memory import get_buffer

router = APIRouter()


class AgentRequest(BaseModel):
    query: str


@router.post("/agent", status_code=status.HTTP_201_CREATED)
async def agent(request: AgentRequest = Body(...)):
    try:
        user_id = "teeest1"

        buffer = get_buffer(user_id)

        # Add system instruction for the AI agent's behavior
        system_prompt = f"""You are a helpful assistant for fitness and meal planning. 
Use tools only when needed. Give concise, practical advice based on the user's input.
Past conversations (if any): {buffer[-5:] if buffer else "None found."}
To retrieve older information, use the 'get_memories' tool when relevant.
User query: {request.query}
"""

        # Construct message history with system, memory buffer, and user message
        messages = [system_prompt]

        initial_state = {
            "messages": messages,
            "user_query": request.query,
            "final_answer": None,
            "user_id": user_id,
        }

        # Get and run agent
        app = get_agent().compile()
        result = await app.ainvoke(initial_state)

        return JSONResponse(content=result, status_code=status.HTTP_201_CREATED)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON format in request body",
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    except Exception as e:
        # Add more detailed error logging
        import traceback

        error_details = traceback.format_exc()
        print(f"Error in agent endpoint: {error_details}")  # Log the full traceback

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An internal server error occurred: {str(e)}",
        )
