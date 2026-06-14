const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";
const RATING_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

let movies = [];
let recommendations = [];
const userRatings = {};

const feedbackEl = document.getElementById("feedback");
const searchQueryEl = document.getElementById("searchQuery");
const searchBtn = document.getElementById("searchBtn");
const searchSummary = document.getElementById("searchSummary");
const movieCountBadge = document.getElementById("movieCountBadge");
const moviesTableBody = document.getElementById("moviesTableBody");
const noMoviesMessage = document.getElementById("noMoviesMessage");
const addMovieForm = document.getElementById("addMovieForm");
const newMovieTitleEl = document.getElementById("newMovieTitle");
const newMovieGenresEl = document.getElementById("newMovieGenres");
const addMovieBtn = document.getElementById("addMovieBtn");
const ratingCountText = document.getElementById("ratingCountText");
const ratingStack = document.getElementById("ratingStack");
const clearRatingsBtn = document.getElementById("clearRatingsBtn");
const recommendBtn = document.getElementById("recommendBtn");
const recommendationCountBadge = document.getElementById("recommendationCountBadge");
const recommendationsEmpty = document.getElementById("recommendationsEmpty");
const recommendationsContainer = document.getElementById("recommendationsContainer");
const recommendationsTableBody = document.getElementById("recommendationsTableBody");
const ratingsModal = document.getElementById("ratingsModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalMovieTitle = document.getElementById("modalMovieTitle");
const ratingsList = document.getElementById("ratingsList");

function showFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;
  feedbackEl.classList.remove("hidden");

  clearTimeout(showFeedback.timer);
  showFeedback.timer = setTimeout(() => {
    feedbackEl.classList.add("hidden");
  }, 3600);
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

function movieLabel(movieId) {
  const movie = movies.find((item) => item.movieId === Number(movieId));
  return movie ? movie.title : `Movie ${movieId}`;
}

function genreTags(genres) {
  return genres
    .split("|")
    .filter(Boolean)
    .map((genre) => `<span class="genre-tag">${escapeHtml(genre)}</span>`)
    .join("");
}

function updateRatingQueue() {
  const entries = Object.entries(userRatings);
  ratingCountText.textContent = `${entries.length} rating${entries.length === 1 ? "" : "s"} selected`;
  ratingStack.innerHTML = "";

  if (entries.length === 0) {
    ratingStack.innerHTML = '<p class="quiet">Rate movies in the catalog to build a temporary profile.</p>';
    return;
  }

  entries.slice(-6).reverse().forEach(([movieId, rating]) => {
    const item = document.createElement("div");
    item.className = "rating-stack-item";
    item.innerHTML = `
      <strong title="${escapeHtml(movieLabel(movieId))}">${escapeHtml(movieLabel(movieId))}</strong>
      <span>${Number(rating).toFixed(1)} ★</span>
    `;
    ratingStack.appendChild(item);
  });
}

function renderMovies() {
  movieCountBadge.textContent = `${movies.length} movie${movies.length === 1 ? "" : "s"}`;
  moviesTableBody.innerHTML = "";

  if (movies.length === 0) {
    noMoviesMessage.classList.remove("hidden");
    return;
  }

  noMoviesMessage.classList.add("hidden");

  movies.forEach((movie) => {
    const row = document.createElement("article");
    row.className = "movie-row";
    const selectedRating = userRatings[movie.movieId];
    const ratingButtons = RATING_OPTIONS.map((rating) => {
      const selected = Number(selectedRating) === rating ? "selected" : "";
      return `
        <button
          class="rating-chip ${selected}"
          type="button"
          data-movie-id="${movie.movieId}"
          data-rating="${rating}"
          aria-label="Rate ${escapeHtml(movie.title)} ${rating} stars"
        >${Number(rating).toFixed(1)}</button>
      `;
    }).join("");

    row.innerHTML = `
      <div class="movie-title">
        <h3>${escapeHtml(movie.title)}</h3>
        <p class="movie-id">Movie ID ${movie.movieId}</p>
        <div class="genre-list">${genreTags(movie.genres)}</div>
      </div>

      <div class="rating-summary">
        <div class="score"><span>★</span>${Number(movie.averageRating || 0).toFixed(2)}</div>
        <small>${movie.ratingCount} dataset rating${movie.ratingCount === 1 ? "" : "s"}</small>
      </div>

      <div class="rating-picker">
        ${ratingButtons}
      </div>

      <button
        class="detail-action view-ratings-btn"
        type="button"
        data-movie-id="${movie.movieId}"
        aria-label="View ratings for ${escapeHtml(movie.title)}"
      >
        Ratings
      </button>
    `;

    moviesTableBody.appendChild(row);
  });

  document.querySelectorAll(".rating-chip").forEach((button) => {
    button.addEventListener("click", handleRatingClick);
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
  recommendationCountBadge.textContent = `${recommendations.length} pick${recommendations.length === 1 ? "" : "s"}`;

  recommendations.forEach((movie, index) => {
    const item = document.createElement("article");
    item.className = "recommendation-item";
    item.innerHTML = `
      <div class="rank-badge ${index === 0 ? "top" : ""}">${index + 1}</div>
      <div class="recommendation-copy">
        <h3>${escapeHtml(movie.title)}</h3>
        ${index === 0 ? '<span class="top-pick">Top pick</span>' : ""}
        <div class="genre-list">${genreTags(movie.genres)}</div>
      </div>
      <div class="predicted-score">${Number(movie.predictedRating).toFixed(2)}</div>
    `;
    recommendationsTableBody.appendChild(item);
  });
}

async function loadMovies(showMessage = false) {
  const keyword = searchQueryEl.value.trim();
  const query = encodeURIComponent(keyword);
  searchBtn.disabled = true;

  try {
    const data = await apiRequest(`/movies?search=${query}`);
    movies = data.movies;
    searchSummary.textContent = keyword
      ? `Showing matches for "${keyword}".`
      : "Showing the opening catalog sample.";
    renderMovies();
    updateRatingQueue();

    if (showMessage) {
      showFeedback(`Found ${movies.length} movie${movies.length === 1 ? "" : "s"}.`, "success");
    }
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    searchBtn.disabled = false;
  }
}

async function handleAddMovie() {
  const title = newMovieTitleEl.value.trim();
  const genres = newMovieGenresEl.value.trim();

  if (!title || !genres) {
    showFeedback("Enter both a title and at least one genre.", "error");
    return;
  }

  addMovieBtn.disabled = true;
  addMovieBtn.textContent = "Adding...";

  try {
    const data = await apiRequest("/movies", {
      method: "POST",
      body: JSON.stringify({ title, genres })
    });
    newMovieTitleEl.value = "";
    newMovieGenresEl.value = "";
    searchQueryEl.value = title;
    await loadMovies(false);
    showFeedback(`Movie added with ID ${data.movieId}.`, "success");
  } catch (error) {
    showFeedback(error.message, "error");
  } finally {
    addMovieBtn.disabled = false;
    addMovieBtn.textContent = "Add to Catalog";
  }
}

function handleRatingClick(event) {
  const movieId = Number(event.currentTarget.dataset.movieId);
  const rating = Number(event.currentTarget.dataset.rating);

  if (userRatings[movieId] === rating) {
    delete userRatings[movieId];
    showFeedback("Rating removed from this browser session.", "success");
  } else {
    userRatings[movieId] = rating;
    showFeedback("Rating saved for this browser session.", "success");
  }

  renderMovies();
  updateRatingQueue();
}

function collectRatings() {
  return Object.entries(userRatings).map(([movieId, rating]) => ({
    movieId: Number(movieId),
    rating: Number(rating)
  }));
}

async function handleGetRecommendations() {
  const ratings = collectRatings();

  if (ratings.length === 0) {
    showFeedback("Rate at least one movie before requesting recommendations.", "error");
    return;
  }

  recommendBtn.disabled = true;
  recommendBtn.textContent = "Generating...";

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
  } finally {
    recommendBtn.disabled = false;
    recommendBtn.textContent = "Get Recommendations";
  }
}

async function handleShowRatings(event) {
  const movieId = Number(event.currentTarget.dataset.movieId);
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
      const item = document.createElement("div");
      item.className = "rating-item";
      item.innerHTML = `
        <div class="rating-user">
          <div class="user-avatar">${String(rating.userId).slice(-2)}</div>
          <strong>User ${rating.userId}</strong>
        </div>
        <strong>${Number(rating.rating).toFixed(1)} ★</strong>
      `;
      ratingsList.appendChild(item);
    });
  } catch (error) {
    ratingsList.innerHTML = `<div class="rating-item">${escapeHtml(error.message)}</div>`;
  }
}

function clearRatings() {
  Object.keys(userRatings).forEach((movieId) => {
    delete userRatings[movieId];
  });
  recommendations = [];
  renderMovies();
  renderRecommendations();
  updateRatingQueue();
  showFeedback("Session ratings cleared.", "success");
}

function closeModal() {
  ratingsModal.classList.add("hidden");
}

searchBtn.addEventListener("click", () => loadMovies(true));
addMovieBtn.addEventListener("click", handleAddMovie);
addMovieForm.addEventListener("submit", handleAddMovie);
recommendBtn.addEventListener("click", handleGetRecommendations);
clearRatingsBtn.addEventListener("click", clearRatings);
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
updateRatingQueue();
