from fastapi import FastAPI
from agent_routes import router as agent_router

app = FastAPI()
app.include_router(agent_router)
