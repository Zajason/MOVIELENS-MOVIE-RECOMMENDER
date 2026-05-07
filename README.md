# MovieLens Movie Recommender

Vanilla HTML/CSS/JavaScript frontend and Python FastAPI backend for the MovieLens assignment.

Run the backend first:

```bash
cd backend
pip install -r requirements.txt
python init_db.py
uvicorn main:app --host 0.0.0.0 --port 3000
```

Then open `frontend/index.html` in a browser.
