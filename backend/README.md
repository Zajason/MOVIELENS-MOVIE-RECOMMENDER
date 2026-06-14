# MovieLens Backend

FastAPI backend for the Web Applications Development 2026 assignment.

## Setup

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
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
cd backend
../.venv/bin/python init_db.py
```

This creates `backend/movielens.db` with the required `movies`, `ratings`, and `tags` tables populated from the CSV files.

## Run the API

```bash
cd backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000
```

Base API URL:

```text
http://127.0.0.1:3000/movielens/api
```

Implemented endpoints:

- `GET /movies?search={keyword}`
- `GET /ratings/{movieId}`
- `POST /movies`
- `POST /recommendations`

## If Port 3000 Is Already In Use

If another project is already running on port `3000`, find the process:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Then stop it using the PID shown in the output:

```bash
kill <PID>
```

For example, if the PID is `24662`:

```bash
kill 24662
```

After that, run the MovieLens API again:

```bash
cd backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000
```

## Run the Frontend

The frontend is a static vanilla HTML/CSS/JavaScript application. Open:

```text
frontend/index.html
```

You can also preview it with Python's built-in static server:

```bash
cd frontend
python3 -m http.server 8081
```

Then visit:

```text
http://127.0.0.1:8081/
```


