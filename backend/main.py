from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agent_routes import router as agent_router

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # React dev server
        "http://127.0.0.1:5173",  # Sometimes used too
        # Add production URL(s) here when deploying
        "https://knowdroids-fit-planner-itfs35ts3-anas-projects-6124f869.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent_router)
