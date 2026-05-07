# MovieLens Backend

FastAPI backend for the Web Applications Development 2026 assignment.

## Setup

From the project root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

The required MovieLens dataset archive is expected at:

```text
backend/data/ml-latest-small.zip
```

If it is missing, download it from:

```text
https://files.grouplens.org/datasets/movielens/ml-latest-small.zip
```

## Create and Populate the Database

```bash
python init_db.py
```

This creates `backend/movielens.db` with the required `movies`, `ratings`, and `tags` tables populated from the CSV files.

## Run the API

```bash
uvicorn main:app --host 0.0.0.0 --port 3000
```

Base API URL:

```text
http://localhost:3000/movielens/api
```

Implemented endpoints:

- `GET /movies?search={keyword}`
- `GET /ratings/{movieId}`
- `POST /movies`
- `POST /recommendations`
