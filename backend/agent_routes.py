from fastapi import APIRouter, HTTPException, status, Body
from fastapi.responses import JSONResponse
import json
from pydantic import BaseModel
from fastapi import Depends
from auth.clerk_auth import get_current_user_id


from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage

from agent_workflow import get_agent
from memory.memory import get_buffer

router = APIRouter()


class AgentRequest(BaseModel):
    message: str
    timestamp: str


@router.post("/agent", status_code=status.HTTP_201_CREATED)
async def agent(
    request: AgentRequest = Body(...),
    user_id: str = Depends(get_current_user_id),
):
    try:
        message = request.message
        timestamp = request.timestamp

        buffer = get_buffer(user_id)

        system_prompt = f"""You are a helpful assistant for fitness and meal planning. 
Use tools only when needed. Give concise, practical advice based on the user's input.
Past conversations (if any): {buffer[-5:] if buffer else "None found."}
To retrieve older information, use the 'get_memories' tool when relevant.
User query: {message}
The timestamp of this request is {timestamp}.
"""

        messages = [system_prompt]

        initial_state = {
            "messages": messages,
            "user_query": message,
            "final_answer": None,
            "user_id": user_id,
        }

        app = get_agent().compile()
        result = await app.ainvoke(initial_state)

        result["final_answer"] = (
            result["messages"][-1]["content"]
            if result["messages"]
            else "No response generated."
        )

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
        import traceback

        print("Error in /agent endpoint:", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}",
        )
