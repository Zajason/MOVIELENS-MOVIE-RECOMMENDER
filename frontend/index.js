const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";

let movies = [];
let recommendations = [];
const userRatings = {};

const feedbackEl = document.getElementById("feedback");
const newMovieTitleEl = document.getElementById("newMovieTitle");
const newMovieGenresEl = document.getElementById("newMovieGenres");
const addMovieBtn = document.getElementById("addMovieBtn");
const searchQueryEl = document.getElementById("searchQuery");
const searchBtn = document.getElementById("searchBtn");
const moviesTableBody = document.getElementById("moviesTableBody");
const noMoviesMessage = document.getElementById("noMoviesMessage");
const movieCountBadge = document.getElementById("movieCountBadge");
const recommendBtn = document.getElementById("recommendBtn");
const recommendationsContainer = document.getElementById("recommendationsContainer");
const recommendationsTableBody = document.getElementById("recommendationsTableBody");
const recommendationsEmpty = document.getElementById("recommendationsEmpty");
const recommendationCountBadge = document.getElementById("recommendationCountBadge");
const ratingsModal = document.getElementById("ratingsModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalMovieTitle = document.getElementById("modalMovieTitle");
const ratingsList = document.getElementById("ratingsList");

function showFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;
  feedbackEl.classList.remove("hidden");

  clearTimeout(showFeedback._timer);
  showFeedback._timer = setTimeout(() => {
    feedbackEl.classList.add("hidden");
  }, 3500);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== "success") {
    throw new Error(data.detail || `The server returned HTTP ${response.status}.`);
  }
  return data;
}

function renderMovies() {
  movieCountBadge.textContent = `${movies.length} shown`;
  moviesTableBody.innerHTML = "";

  if (movies.length === 0) {
    noMoviesMessage.classList.remove("hidden");
    return;
  }

  noMoviesMessage.classList.add("hidden");

  movies.forEach((movie) => {
    const article = document.createElement("article");
    article.className = "movie-item";
    const genreHtml = movie.genres
      .split("|")
      .map((genre) => `<span class="genre-tag">${escapeHtml(genre)}</span>`)
      .join("");
    const ownRating = userRatings[movie.movieId] ?? "";

    article.innerHTML = `
      <div class="movie-main">
        <h3>${escapeHtml(movie.title)}</h3>
        <div class="genre-list">${genreHtml}</div>
      </div>
      <div class="movie-average">
        <span class="metric-label">Average</span>
        <div class="rating-cell">
          <span>★</span>
          <span>${Number(movie.averageRating || 0).toFixed(2)}</span>
          <small>(${movie.ratingCount})</small>
        </div>
      </div>
      <div class="movie-rate">
        <label>Your rating</label>
        <div class="your-rating-wrapper">
          <input
            class="rating-input"
            type="number"
            min="0.5"
            max="5"
            step="0.5"
            value="${ownRating}"
            data-movie-id="${movie.movieId}"
            aria-label="Your rating for ${escapeHtml(movie.title)}"
          />
          ${ownRating ? "<span>★</span>" : ""}
        </div>
      </div>
      <div class="movie-action">
        <button class="secondary-btn view-ratings-btn" data-movie-id="${movie.movieId}">
          View Ratings
        </button>
      </div>
    `;

    moviesTableBody.appendChild(article);
  });

  document.querySelectorAll(".rating-input").forEach((input) => {
    input.addEventListener("change", handleRateMovie);
  });

  document.querySelectorAll(".view-ratings-btn").forEach((button) => {
    button.addEventListener("click", handleShowRatings);
  });
}

function renderRecommendations() {
  recommendationsTableBody.innerHTML = "";

  if (recommendations.length === 0) {
    recommendationsContainer.classList.add("hidden");
    recommendationsEmpty.classList.remove("hidden");
    recommendationCountBadge.classList.add("hidden");
    return;
  }

  recommendationsContainer.classList.remove("hidden");
  recommendationsEmpty.classList.add("hidden");
  recommendationCountBadge.classList.remove("hidden");
  recommendationCountBadge.textContent = `${recommendations.length} picks`;

  recommendations.forEach((rec, index) => {
    const article = document.createElement("article");
    article.className = "recommendation-item";
    const genreHtml = rec.genres
      .split("|")
      .map((genre) => `<span class="genre-tag">${escapeHtml(genre)}</span>`)
      .join("");

    article.innerHTML = `
      <div class="rank-badge ${index === 0 ? "top" : ""}">${index + 1}</div>
      <div class="recommendation-copy">
        <h3>
          ${escapeHtml(rec.title)}
        </h3>
        ${index === 0 ? '<span class="top-pick">Top Pick</span>' : ""}
        <div class="genre-list">${genreHtml}</div>
      </div>
      <div class="predicted-score">
        <span>★</span>
        ${Number(rec.predictedRating).toFixed(2)}
      </div>
    `;

    recommendationsTableBody.appendChild(article);
  });
}

async function loadMovies(showMessage = false) {
  const query = encodeURIComponent(searchQueryEl.value.trim());
  try {
    const data = await apiRequest(`/movies?search=${query}`);
    movies = data.movies;
    renderMovies();
    if (showMessage) {
      showFeedback(`Found ${movies.length} movie(s)`, "success");
    }
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

async function handleAddMovie() {
  const title = newMovieTitleEl.value.trim();
  const genres = newMovieGenresEl.value.trim();

  if (!title || !genres) {
    showFeedback("Please enter both a title and at least one genre.", "error");
    return;
  }

  try {
    await apiRequest("/movies", {
      method: "POST",
      body: JSON.stringify({ title, genres })
    });
    newMovieTitleEl.value = "";
    newMovieGenresEl.value = "";
    searchQueryEl.value = title;
    await loadMovies(false);
    showFeedback("Movie added successfully.", "success");
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

function handleRateMovie(event) {
  const movieId = Number(event.target.dataset.movieId);
  const rating = parseFloat(event.target.value);

  if (Number.isNaN(rating) || rating < 0.5 || rating > 5) {
    delete userRatings[movieId];
    renderMovies();
    showFeedback("Rating must be between 0.5 and 5.0.", "error");
    return;
  }

  userRatings[movieId] = rating;
  renderMovies();
  showFeedback("Rating saved for this browser session.", "success");
}

function collectVisibleRatings() {
  document.querySelectorAll(".rating-input").forEach((input) => {
    const movieId = Number(input.dataset.movieId);
    const rating = parseFloat(input.value);

    if (!input.value) {
      delete userRatings[movieId];
    } else if (!Number.isNaN(rating) && rating >= 0.5 && rating <= 5) {
      userRatings[movieId] = rating;
    }
  });

  return Object.entries(userRatings).map(([movieId, rating]) => ({
    movieId: Number(movieId),
    rating
  }));
}

async function handleShowRatings(event) {
  const movieId = Number(event.target.dataset.movieId);
  const movie = movies.find((item) => item.movieId === movieId);
  modalMovieTitle.textContent = movie ? movie.title : `Movie ${movieId}`;
  ratingsList.innerHTML = '<div class="rating-item">Loading ratings...</div>';
  ratingsModal.classList.remove("hidden");

  try {
    const data = await apiRequest(`/ratings/${movieId}`);
    ratingsList.innerHTML = "";

    if (data.ratings.length === 0) {
      ratingsList.innerHTML = '<div class="rating-item">No ratings found for this movie.</div>';
      return;
    }

    data.ratings.slice(0, 100).forEach((rating) => {
      const div = document.createElement("div");
      div.className = "rating-item";
      div.innerHTML = `
        <div class="rating-user">
          <div class="user-avatar">${String(rating.userId).slice(-2)}</div>
          <span>User ${rating.userId}</span>
        </div>
        <div>★ ${Number(rating.rating).toFixed(1)}</div>
      `;
      ratingsList.appendChild(div);
    });
  } catch (error) {
    ratingsList.innerHTML = `<div class="rating-item">${escapeHtml(error.message)}</div>`;
  }
}

function closeModal() {
  ratingsModal.classList.add("hidden");
}

async function handleGetRecommendations() {
  const ratings = collectVisibleRatings();

  if (ratings.length === 0) {
    showFeedback("Rate at least one movie before requesting recommendations.", "error");
    return;
  }

  try {
    const data = await apiRequest("/recommendations", {
      method: "POST",
      body: JSON.stringify({ ratings })
    });
    recommendations = data.recommendations;
    renderRecommendations();
    showFeedback(
      recommendations.length ? "Recommendations generated." : "No recommendations found for those ratings.",
      recommendations.length ? "success" : "error"
    );
  } catch (error) {
    showFeedback(error.message, "error");
  }
}

addMovieBtn.addEventListener("click", handleAddMovie);
searchBtn.addEventListener("click", () => loadMovies(true));
recommendBtn.addEventListener("click", handleGetRecommendations);
closeModalBtn.addEventListener("click", closeModal);

searchQueryEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    loadMovies(true);
  }
});

ratingsModal.addEventListener("click", (event) => {
  if (event.target.classList.contains("modal") || event.target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});

loadMovies(false);
renderRecommendations();
