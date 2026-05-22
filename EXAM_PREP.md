# Internet Applications Exam Prep

This guide is for the current MovieLens app. The exam will probably ask you to explain the app, debug it, or add a feature without using frontend frameworks.

## 1. What The App Is Doing

The browser opens `frontend/index.html`. That file loads `index.css` for styling and `index.js` for behavior.

The JavaScript talks to the backend with:

```js
const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";
```

The backend is a FastAPI app in `backend/main.py`. It exposes REST-style endpoints:

| Method | URL | Meaning |
| --- | --- | --- |
| `GET` | `/movielens/api/health` | Check server is running |
| `GET` | `/movielens/api/movies?search=matrix` | Search movies |
| `GET` | `/movielens/api/ratings/{movie_id}` | Get ratings for one movie |
| `POST` | `/movielens/api/movies` | Add a movie |
| `POST` | `/movielens/api/recommendations` | Send user ratings and get recommendations |

The database is SQLite. Tables are created in `backend/init_db.py`:

| Table | Purpose |
| --- | --- |
| `movies` | Movie ID, title, genres |
| `ratings` | User ratings from MovieLens |
| `tags` | User tags from MovieLens |

Most backend logic is in `backend/crud.py`. The routes in `main.py` should stay simple.

## 2. Lecture Concepts You Should Know

### HTTP

HTTP is a client-server protocol. The browser/client sends an HTTP request. The backend/server sends an HTTP response.

A request has:

- method: `GET`, `POST`, `PUT`, `DELETE`
- URL/path: `/movielens/api/movies`
- headers: metadata like `Content-Type: application/json`
- optional body: JSON data for `POST`/`PUT`

A response has:

- status code: `200`, `400`, `404`, `500`
- headers: metadata like `Content-Type`
- body: usually JSON in this app

HTTP is stateless. The server does not automatically remember the previous request. In this app, the frontend keeps temporary ratings in the browser in `userRatings`.

### MIME Types And JSON

The frontend sends and receives JSON:

```js
headers: { "Content-Type": "application/json" }
```

JSON must use double-quoted keys and values cannot be functions or `undefined`.

Example JSON body:

```json
{
  "ratings": [
    { "movieId": 1, "rating": 4.5 }
  ]
}
```

### REST

REST-style APIs model important things as resources:

- `/movies`
- `/movies/{id}`
- `/ratings/{movie_id}`
- `/recommendations`

Use HTTP methods with their normal meaning:

| Method | Use |
| --- | --- |
| `GET` | read data |
| `POST` | create or submit data |
| `PUT` | replace/update data |
| `DELETE` | remove data |

Query parameters are for filters/options:

```text
/movies?search=toy&genre=Comedy&limit=20
```

Path parameters identify a specific resource:

```text
/ratings/1
```

Request body is for structured data:

```text
POST /recommendations
```

### CORS

CORS controls whether browser JavaScript from one origin may call another origin.

This app allows all origins in `backend/main.py`:

```py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

If the frontend says the request is blocked by CORS, check this middleware and check that the frontend API URL points to the right backend.

### JavaScript Runtime

JavaScript in the browser is event-driven and single-threaded. You attach handlers:

```js
searchBtn.addEventListener("click", () => loadMovies(true));
```

Network calls are asynchronous. `fetch()` returns a Promise, so this app uses `async`/`await`:

```js
async function loadMovies() {
  const data = await apiRequest("/movies?search=matrix");
  movies = data.movies;
  renderMovies();
}
```

The DOM is the browser's object model for the page. This app updates the DOM by creating elements and assigning `innerHTML`.

## 3. The Recommendation Algorithm

The app uses user-based collaborative filtering with Pearson correlation.

Steps:

1. The user rates movies in the frontend.
2. The frontend sends ratings to `POST /recommendations`.
3. The backend finds MovieLens users who rated at least one of the same movies.
4. For each candidate user, it calculates Pearson similarity against the current user's ratings.
5. It keeps the top `TOP_K_USERS = 20` similar users.
6. For movies the current user has not rated, it predicts a score using weighted ratings from similar users.
7. It returns the top `TOP_N_RECOMMENDATIONS = 10`.

Important file: `backend/crud.py`.

Pearson correlation rewards users whose rating patterns move together. If two users both rate the same shared movies similarly, their similarity is high.

## 4. The Standard Way To Add Any Feature

Most exam tasks can be solved with this pattern:

1. Add database query logic in `backend/crud.py`.
2. Add request/response validation in `backend/schemas.py` if the endpoint receives JSON.
3. Add a route in `backend/main.py`.
4. Test backend with `curl`.
5. Add HTML controls in `frontend/index.html`.
6. Select those controls in `frontend/index.js`.
7. Add event listeners.
8. Call the backend using `apiRequest`.
9. Store the result in a JS variable.
10. Render the result into the DOM.

Keep this separation clear in the exam.

## 5. Likely Exam Tasks And How To Do Them

### Task A: Add Genre Filtering

Backend idea:

```py
@app.get("/movielens/api/movies")
def search_movies(search: str = Query(default=""), genre: str = Query(default="")) -> dict:
    return {"status": "success", "movies": crud.search_movies(search, genre)}
```

Then update `crud.search_movies`:

```py
def search_movies(keyword: str = "", genre: str = "") -> list[dict]:
    search = f"%{keyword.strip()}%"
    genre_search = f"%{genre.strip()}%"
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT m.movieId, m.title, m.genres,
                   AVG(r.rating) AS averageRating,
                   COUNT(r.rating) AS ratingCount
            FROM movies AS m
            LEFT JOIN ratings AS r ON r.movieId = m.movieId
            WHERE LOWER(m.title) LIKE LOWER(?)
              AND (? = '%%' OR LOWER(m.genres) LIKE LOWER(?))
            GROUP BY m.movieId, m.title, m.genres
            ORDER BY m.title
            LIMIT 100
            """,
            (search, genre_search, genre_search),
        ).fetchall()
    return [_movie_row_to_dict(row) for row in rows]
```

Frontend idea:

```html
<input id="genreFilter" placeholder="Comedy" />
```

```js
const genreFilterEl = document.getElementById("genreFilter");

async function loadMovies(showMessage = false) {
  const query = encodeURIComponent(searchQueryEl.value.trim());
  const genre = encodeURIComponent(genreFilterEl.value.trim());
  const data = await apiRequest(`/movies?search=${query}&genre=${genre}`);
  movies = data.movies;
  renderMovies();
}
```

### Task B: Add Pagination

Backend:

```py
@app.get("/movielens/api/movies")
def search_movies(
    search: str = Query(default=""),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> dict:
    return {"status": "success", "movies": crud.search_movies(search, limit, offset)}
```

SQL:

```sql
LIMIT ? OFFSET ?
```

Frontend:

```js
let page = 0;
const pageSize = 20;
const data = await apiRequest(`/movies?search=${query}&limit=${pageSize}&offset=${page * pageSize}`);
```

### Task C: Add Sorting

Let the user choose `title`, `averageRating`, or `ratingCount`.

Do not put raw user input directly into SQL `ORDER BY`. Map allowed values:

```py
sort_columns = {
    "title": "m.title ASC",
    "rating": "averageRating DESC",
    "count": "ratingCount DESC",
}
order_by = sort_columns.get(sort, "m.title ASC")
```

Then inject only the safe mapped string:

```py
f"ORDER BY {order_by}"
```

### Task D: Add Movie Tags Endpoint

Backend route:

```py
@app.get("/movielens/api/tags/{movie_id}")
def get_tags(movie_id: int) -> dict:
    return {"status": "success", "tags": crud.get_movie_tags(movie_id)}
```

CRUD:

```py
def get_movie_tags(movie_id: int) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT userId, tag, timestamp
            FROM tags
            WHERE movieId = ?
            ORDER BY timestamp DESC
            LIMIT 100
            """,
            (movie_id,),
        ).fetchall()
    return [dict(row) for row in rows]
```

Frontend: copy the pattern from `handleShowRatings`.

### Task E: Add Delete Movie

REST route:

```py
@app.delete("/movielens/api/movies/{movie_id}")
def delete_movie(movie_id: int) -> dict:
    deleted = crud.delete_movie(movie_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Movie not found.")
    return {"status": "success"}
```

CRUD:

```py
def delete_movie(movie_id: int) -> bool:
    with get_connection() as conn:
        conn.execute("DELETE FROM ratings WHERE movieId = ?", (movie_id,))
        conn.execute("DELETE FROM tags WHERE movieId = ?", (movie_id,))
        cursor = conn.execute("DELETE FROM movies WHERE movieId = ?", (movie_id,))
        conn.commit()
    return cursor.rowcount > 0
```

Frontend button:

```js
await apiRequest(`/movies/${movieId}`, { method: "DELETE" });
await loadMovies(false);
```

### Task F: Save User Ratings After Refresh

At the top of `index.js`:

```js
const userRatings = JSON.parse(localStorage.getItem("userRatings") || "{}");
```

After changing a rating:

```js
localStorage.setItem("userRatings", JSON.stringify(userRatings));
```

Remember: localStorage is client-side browser storage, not backend storage.

### Task G: Add Loading State

Pattern:

```js
async function handleGetRecommendations() {
  recommendBtn.disabled = true;
  recommendBtn.textContent = "Loading...";
  try {
    const data = await apiRequest("/recommendations", {
      method: "POST",
      body: JSON.stringify({ ratings: collectVisibleRatings() })
    });
    recommendations = data.recommendations;
    renderRecommendations();
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    recommendBtn.disabled = false;
    recommendBtn.textContent = "Get Recommendations";
  }
}
```

Use `finally` because it runs after success or error.

## 6. Common Bugs And How To Explain Them

### Backend Not Running

Symptom: frontend says request failed.

Check:

```bash
curl -i http://127.0.0.1:3000/movielens/api/health
```

Expected:

```json
{"status":"success","message":"MovieLens API is running"}
```

Run backend:

```bash
cd backend
../.venv/bin/uvicorn main:app --host 127.0.0.1 --port 3000
```

### Wrong API URL

If frontend calls `localhost:3000` but another server is there, requests fail. This is why the app uses:

```js
http://127.0.0.1:3000/movielens/api
```

### 422 Validation Error

FastAPI returns `422` when the JSON body does not match the Pydantic schema.

For recommendations, the body must be:

```json
{
  "ratings": [
    { "movieId": 1, "rating": 4.5 }
  ]
}
```

### SQL Injection Risk

Use parameterized SQL:

```py
conn.execute("SELECT * FROM movies WHERE title LIKE ?", (search,))
```

Do not do:

```py
f"SELECT * FROM movies WHERE title LIKE '%{search}%'"
```

## 7. How To Talk Through The App In The Exam

Good explanation:

"The frontend is a static HTML/CSS/JavaScript app. It listens for user events like search clicks or rating changes. When it needs data, it uses `fetch()` to call the FastAPI backend. The backend exposes REST-style endpoints under `/movielens/api`. FastAPI validates request bodies using Pydantic schemas. The backend then calls functions in `crud.py`, which use SQLite parameterized queries. Responses are JSON, and the frontend renders them into the DOM."

Good recommendation explanation:

"The recommendation endpoint receives the current user's ratings. Since this user is not stored in the MovieLens database, the backend treats those submitted ratings as a temporary active user profile. It finds existing users with overlap, computes Pearson similarity, keeps the top similar users, and predicts ratings for unseen movies using weighted deviations from those similar users' averages."

## 8. Fast Checklist Before Exam

- Know where routes live: `backend/main.py`.
- Know where SQL lives: `backend/crud.py`.
- Know where request body validation lives: `backend/schemas.py`.
- Know where database tables are created: `backend/init_db.py`.
- Know where frontend state lives: `movies`, `recommendations`, `userRatings` in `frontend/index.js`.
- Know how to add an HTML input and read it with `document.getElementById`.
- Know how to attach an event with `addEventListener`.
- Know how to call backend with `fetch`.
- Know the difference between path params, query params, and JSON body.
- Know the meaning of `GET`, `POST`, `PUT`, `DELETE`.
- Know why CORS exists.
- Know what HTTP status codes mean.
- Know why SQL parameters matter.

