from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import crud
from database import DB_PATH
from init_db import initialize_database
from schemas import MovieCreate, RecommendationRequest


app = FastAPI(title="MovieLens Explorer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def ensure_database() -> None:
    if not DB_PATH.exists():
        initialize_database()


@app.get("/movielens/api/health")
def health() -> dict:
    return {"status": "success", "message": "MovieLens API is running"}


@app.get("/movielens/api/movies")
def search_movies(search: str = Query(default="")) -> dict:
    return {"status": "success", "movies": crud.search_movies(search)}


@app.get("/movielens/api/ratings/{movie_id}")
def get_ratings(movie_id: int) -> dict:
    return {"status": "success", "ratings": crud.get_movie_ratings(movie_id)}


@app.post("/movielens/api/movies")
def add_movie(movie: MovieCreate) -> dict:
    try:
        movie_id = crud.add_movie(movie.title, movie.genres)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "success", "movieId": movie_id}


@app.post("/movielens/api/recommendations")
def get_recommendations(request: RecommendationRequest) -> dict:
    try:
        recommendations = crud.get_recommendations([rating.model_dump() for rating in request.ratings])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "success", "recommendations": recommendations}
