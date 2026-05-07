from pydantic import BaseModel, Field


class MovieCreate(BaseModel):
    title: str = Field(min_length=1)
    genres: str = Field(min_length=1)


class UserRating(BaseModel):
    movieId: int
    rating: float = Field(ge=0.5, le=5.0)


class RecommendationRequest(BaseModel):
    ratings: list[UserRating]
