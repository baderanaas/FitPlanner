from langgraph.graph import StateGraph, END

from agentState import AgentState
from agent.call_model import call_model
from agent.call_tool import call_tool
from memory.memory import store_memory


def should_continue(state: AgentState):
    print("STATE:", state)
    messages = state["messages"]
    last_message = messages[-1]

    # Handle different message types (string vs dict)
    if isinstance(last_message, str):
        # If it's a string, no tool calls possible
        state["final_answer"] = last_message
        print("FINAL ANSWER:", state["final_answer"])
        store_memory(state)
        return "end"

    # Check if the last message (dict) has tool_calls and if it's not empty
    if isinstance(last_message, dict) and last_message.get("tool_calls"):
        return "continue"
    else:
        # Store the final answer and memory before ending
        state["final_answer"] = last_message.get("content", "")
        print("FINAL ANSWER:", state["final_answer"])
        store_memory(state)
        return "end"


def get_agent():
    workflow = StateGraph(AgentState)

    workflow.add_node("agent", call_model)
    workflow.add_node("tools", call_tool)

    workflow.set_entry_point("agent")

    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "tools",
            "end": END,
        },
    )
    workflow.add_edge("tools", "agent")
    workflow.set_entry_point("agent")
    return workflow
