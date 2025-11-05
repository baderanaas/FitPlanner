import os
import hashlib
from dotenv import load_dotenv

from memory.memory_manager import MemoryManager
from agentState import AgentState

load_dotenv()

redis_url = os.getenv("REDIS_URL")
redis_port = int(os.getenv("REDIS_PORT", 12095))
redis_username = os.getenv("REDIS_USERNAME")
redis_password = os.getenv("REDIS_PASSWORD")

qdrant_url = os.getenv("QDRANT_URL")
qdrant_api_key = os.getenv("QDRANT_API_KEY")

memory_manager = MemoryManager(
    qdrant_url=qdrant_url,
    api_key=qdrant_api_key,
    redis_url=redis_url,
    redis_port=redis_port,
    redis_password=redis_password,
    redis_username=redis_username,
)


def store_memory(state: AgentState):
    user_query = state["user_query"]
    agent_answer = state["final_answer"]
    user_id = state["user_id"]

    if user_query and agent_answer:
        memory_manager.save_to_short_term_memory(user_query, agent_answer, user_id)
        memory_manager.save_to_long_term_memory(user_query, agent_answer, user_id)


def get_buffer(user_id):
    return memory_manager.get_from_short_term_memory(user_id)


def get_memories(query, user_id):
    """
    Use this tool to search in long-term memory for relevant conversations that may be mentioned in old conversations.

    Args:
        query: Search query

    Returns:
        List of relevant conversations with scores
    """
    return memory_manager.search_long_term_memory(query=query, user_id=user_id)
