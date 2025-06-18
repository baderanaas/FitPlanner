import json
import logging
import inspect
from datetime import datetime
from typing import Dict, Any, Union

from agentState import AgentState
from tool_definition import get_tools_mapping

MAX_TOOL_RETRIES = 3

tool_mapping = get_tools_mapping()


async def call_tool(state: AgentState) -> AgentState:
    """Execute tool calls from the agent's last message."""
    if not state["messages"]:
        return state

    last_msg = state["messages"][-1]
    tool_calls = last_msg.get("tool_calls", [])

    if not tool_calls:
        return state

    # Create copies of state dictionaries to modify
    tool_call_history = state.get("tool_call_history", {}).copy()

    # Initialize successful_calls counter
    successful_calls = 0

    tool_messages = []

    for tool_call in tool_calls:
        call_id = tool_call["id"]
        tool_name = tool_call["function"]["name"]

        # Validate tool exists in mapping
        if tool_name not in tool_mapping.keys():
            tool_messages.append(
                {
                    "role": "tool",
                    "content": f"Error: Tool {tool_name} not available",
                    "tool_call_id": call_id,
                    "name": tool_name,
                }
            )
            continue

        try:
            args = json.loads(tool_call["function"]["arguments"])
        except json.JSONDecodeError as e:
            tool_messages.append(
                {
                    "role": "tool",
                    "content": f"Invalid arguments format: {str(e)}",
                    "tool_call_id": call_id,
                    "name": tool_name,
                }
            )
            continue

        # Update tracking
        tool_call_history.setdefault(tool_name, []).append(
            {
                "arguments": args,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Execute tool
        tool_func = tool_mapping[tool_name]
        try:
            # Handle both sync and async tools
            if inspect.iscoroutinefunction(tool_func):
                result = await tool_func(**args)
            else:
                result = tool_func(**args)

            successful_calls += 1
            tool_messages.append(
                {
                    "role": "tool",
                    "content": str(result)[:10000],
                    "tool_call_id": call_id,
                    "name": tool_name,
                }
            )

        except Exception as e:
            tool_messages.append(
                {
                    "role": "tool",
                    "content": f"Error executing {tool_name}: {str(e)}",
                    "tool_call_id": call_id,
                    "name": tool_name,
                }
            )

    return {
        "messages": tool_messages,
        "tool_call_history": tool_call_history,
    }
