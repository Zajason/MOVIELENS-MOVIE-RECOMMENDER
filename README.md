# MovieLens Movie Recommender

Web Applications Development 2026 assignment project.

This project is a MovieLens web application with:

- a vanilla `HTML` / `CSS` / `JavaScript` frontend
- a Python `FastAPI` backend
- an `SQLite` database populated from the MovieLens Latest Small dataset

The application lets users search movies, add new movies, rate movies in browser memory, view dataset ratings, and request personalized movie recommendations.

## Project Structure

```text
frontend/
  index.html
  index.css
  index.js

backend/
  main.py
  crud.py
  schemas.py
  database.py
  init_db.py
  models.py
  requirements.txt
  movielens.db
  data/ml-latest-small.zip
```

## Setup

From the project root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

The MovieLens dataset archive is expected at:

```text
backend/data/ml-latest-small.zip
```

If it is missing, download it from:

```text
https://files.grouplens.org/datasets/movielens/ml-latest-small.zip
```

## Create Or Reset The Database

From the project root:

```bash
cd backend
../.venv/bin/python init_db.py
```

This creates `backend/movielens.db` with the required `movies`, `ratings`, and `tags` tables populated from the CSV files.

Run this again if you want to reset the database back to the original MovieLens dataset contents.

## Run The Backend API

From the project root:

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

Health check:

```bash
curl http://127.0.0.1:3000/movielens/api/health
```

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

## Open The Frontend

The frontend is a static vanilla HTML/CSS/JavaScript application.

Recommended preview command:

```bash
cd frontend
python3 -m http.server 8081
```

Then open this URL in the browser:

```text
http://127.0.0.1:8081/
```

You can also open the file directly:

```text
frontend/index.html
```

The backend must be running on port `3000` for search, ratings, adding movies, and recommendations to work.

## Typical Run Order

Open one terminal for the backend:

```bash
cd backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000
```

Open a second terminal for the frontend preview:

```bash
cd frontend
python3 -m http.server 8081
```

Then visit:

```text
http://127.0.0.1:8081/
```

## Notes

- Frontend ratings are stored only in browser memory during the session.
- Recommendation request ratings are used only for that request and are not stored in the database.
- The backend enables CORS so the static frontend can call the API.
- No frontend frameworks or external frontend libraries are used.
