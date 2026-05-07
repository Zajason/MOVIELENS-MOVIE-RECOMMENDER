from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = BASE_DIR / "movielens.db"
ZIP_PATH = DATA_DIR / "ml-latest-small.zip"
EXTRACTED_DIR = DATA_DIR / "ml-latest-small"
