from fastapi import FastAPI

from app.routes import health, users_with_posts

app = FastAPI(title="Benchmark Seed API", version="0.1.0")

app.include_router(health.router)
app.include_router(users_with_posts.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "Benchmark Seed API"}
