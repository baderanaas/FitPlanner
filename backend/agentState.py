import operator
from typing import TypedDict, Annotated, Sequence, Dict, List

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    user_id: str
    tool_call_history: Dict[str, List[Dict]]
    user_query: str
    final_answer: str
