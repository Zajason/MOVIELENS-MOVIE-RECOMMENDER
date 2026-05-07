import csv
import sqlite3
import zipfile
from pathlib import Path

from database import DB_PATH, EXTRACTED_DIR, ZIP_PATH


def _dataset_file(name: str) -> Path:
    return EXTRACTED_DIR / name


def extract_dataset() -> None:
    if not ZIP_PATH.exists():
        raise FileNotFoundError(
            "Missing backend/data/ml-latest-small.zip. "
            "Download it from https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"
        )

    if _dataset_file("movies.csv").exists():
        return

    with zipfile.ZipFile(ZIP_PATH) as archive:
        archive.extractall(ZIP_PATH.parent)


def create_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS tags;
        DROP TABLE IF EXISTS ratings;
        DROP TABLE IF EXISTS movies;

        CREATE TABLE movies (
            movieId INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genres TEXT NOT NULL
        );

        CREATE TABLE ratings (
            userId INTEGER NOT NULL,
            movieId INTEGER NOT NULL,
            rating REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (movieId) REFERENCES movies(movieId)
        );

        CREATE TABLE tags (
            userId INTEGER NOT NULL,
            movieId INTEGER NOT NULL,
            tag TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (movieId) REFERENCES movies(movieId)
        );

        CREATE INDEX idx_movies_title ON movies(title);
        CREATE INDEX idx_ratings_movie ON ratings(movieId);
        CREATE INDEX idx_ratings_user ON ratings(userId);
        CREATE INDEX idx_tags_movie ON tags(movieId);
        """
    )


def load_csv(conn: sqlite3.Connection, table_name: str, file_name: str) -> None:
    with _dataset_file(file_name).open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = [tuple(row[field] for field in reader.fieldnames) for row in reader]

    placeholders = ", ".join("?" for _ in reader.fieldnames)
    columns = ", ".join(reader.fieldnames)
    conn.executemany(
        f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})",
        rows,
    )


def initialize_database() -> None:
    extract_dataset()
    with sqlite3.connect(DB_PATH) as conn:
        create_tables(conn)
        load_csv(conn, "movies", "movies.csv")
        load_csv(conn, "ratings", "ratings.csv")
        load_csv(conn, "tags", "tags.csv")
        conn.commit()


if __name__ == "__main__":
    initialize_database()
    print(f"Created and populated {DB_PATH}")
