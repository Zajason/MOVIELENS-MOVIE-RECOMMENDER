import math
import sqlite3
from collections import defaultdict

from database import DB_PATH


TOP_K_USERS = 20
TOP_N_RECOMMENDATIONS = 10
MIN_OVERLAP = 2


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _movie_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "movieId": row["movieId"],
        "title": row["title"],
        "genres": row["genres"],
        "averageRating": round(row["averageRating"], 2) if row["averageRating"] is not None else 0,
        "ratingCount": row["ratingCount"],
    }


def search_movies(keyword: str = "") -> list[dict]:
    search = f"%{keyword.strip()}%"
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT
                m.movieId,
                m.title,
                m.genres,
                AVG(r.rating) AS averageRating,
                COUNT(r.rating) AS ratingCount
            FROM movies AS m
            LEFT JOIN ratings AS r ON r.movieId = m.movieId
            WHERE LOWER(m.title) LIKE LOWER(?)
            GROUP BY m.movieId, m.title, m.genres
            ORDER BY m.title
            LIMIT 100
            """,
            (search,),
        ).fetchall()
    return [_movie_row_to_dict(row) for row in rows]


def get_movie_ratings(movie_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT userId, movieId, rating, timestamp
            FROM ratings
            WHERE movieId = ?
            ORDER BY userId
            """,
            (movie_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def add_movie(title: str, genres: str) -> int:
    clean_title = title.strip()
    clean_genres = genres.strip()
    if not clean_title or not clean_genres:
        raise ValueError("Title and genres are required.")

    with get_connection() as conn:
        next_id = conn.execute("SELECT COALESCE(MAX(movieId), 0) + 1 FROM movies").fetchone()[0]
        conn.execute(
            "INSERT INTO movies (movieId, title, genres) VALUES (?, ?, ?)",
            (next_id, clean_title, clean_genres),
        )
        conn.commit()
    return next_id


def _pearson(user_ratings: dict[int, float], other_ratings: dict[int, float]) -> float:
    shared = [movie_id for movie_id in user_ratings if movie_id in other_ratings]
    if len(shared) < MIN_OVERLAP:
        return 0.0

    user_mean = sum(user_ratings[movie_id] for movie_id in shared) / len(shared)
    other_mean = sum(other_ratings[movie_id] for movie_id in shared) / len(shared)
    numerator = sum(
        (user_ratings[movie_id] - user_mean) * (other_ratings[movie_id] - other_mean)
        for movie_id in shared
    )
    user_norm = math.sqrt(sum((user_ratings[movie_id] - user_mean) ** 2 for movie_id in shared))
    other_norm = math.sqrt(sum((other_ratings[movie_id] - other_mean) ** 2 for movie_id in shared))
    denominator = user_norm * other_norm
    return numerator / denominator if denominator else 0.0


def get_recommendations(ratings: list[dict]) -> list[dict]:
    user_ratings = {item["movieId"]: float(item["rating"]) for item in ratings}
    if not user_ratings:
        raise ValueError("At least one rating is required.")

    rated_movie_ids = tuple(user_ratings)
    placeholders = ", ".join("?" for _ in rated_movie_ids)

    with get_connection() as conn:
        overlapping_users = conn.execute(
            f"""
            SELECT DISTINCT userId
            FROM ratings
            WHERE movieId IN ({placeholders})
            """,
            rated_movie_ids,
        ).fetchall()

        user_ids = [row["userId"] for row in overlapping_users]
        if not user_ids:
            return []

        user_placeholders = ", ".join("?" for _ in user_ids)
        rows = conn.execute(
            f"""
            SELECT userId, movieId, rating
            FROM ratings
            WHERE userId IN ({user_placeholders})
            """,
            user_ids,
        ).fetchall()

        ratings_by_user: dict[int, dict[int, float]] = defaultdict(dict)
        for row in rows:
            ratings_by_user[row["userId"]][row["movieId"]] = float(row["rating"])

        similarities = []
        for user_id, other_ratings in ratings_by_user.items():
            score = _pearson(user_ratings, other_ratings)
            if score > 0:
                similarities.append((user_id, score, other_ratings))

        similar_users = sorted(similarities, key=lambda item: item[1], reverse=True)[:TOP_K_USERS]
        if not similar_users:
            return []

        active_user_mean = sum(user_ratings.values()) / len(user_ratings)
        predictions = {}
        for user_id, similarity, other_ratings in similar_users:
            other_mean = sum(other_ratings.values()) / len(other_ratings)
            for movie_id, rating in other_ratings.items():
                if movie_id in user_ratings:
                    continue
                if movie_id not in predictions:
                    predictions[movie_id] = {"weighted_sum": 0.0, "similarity_sum": 0.0}
                predictions[movie_id]["weighted_sum"] += similarity * (rating - other_mean)
                predictions[movie_id]["similarity_sum"] += abs(similarity)

        scored = []
        for movie_id, values in predictions.items():
            if values["similarity_sum"] == 0:
                continue
            predicted = active_user_mean + values["weighted_sum"] / values["similarity_sum"]
            scored.append((movie_id, max(0.5, min(5.0, predicted))))

        top_movie_ids = [movie_id for movie_id, _ in sorted(scored, key=lambda item: item[1], reverse=True)[:TOP_N_RECOMMENDATIONS]]
        if not top_movie_ids:
            return []

        movie_placeholders = ", ".join("?" for _ in top_movie_ids)
        movie_rows = conn.execute(
            f"""
            SELECT movieId, title, genres
            FROM movies
            WHERE movieId IN ({movie_placeholders})
            """,
            top_movie_ids,
        ).fetchall()

    movie_lookup = {row["movieId"]: dict(row) for row in movie_rows}
    prediction_lookup = dict(scored)
    recommendations = []
    for movie_id in top_movie_ids:
        movie = movie_lookup.get(movie_id)
        if movie:
            recommendations.append(
                {
                    "movieId": movie_id,
                    "title": movie["title"],
                    "genres": movie["genres"],
                    "predictedRating": round(prediction_lookup[movie_id], 2),
                }
            )
    return recommendations
