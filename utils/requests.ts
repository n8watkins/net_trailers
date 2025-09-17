// Server-side API routes (no API key exposure)
const requests = {
    fetchTrending: `/api/movies/trending`,
    fetchTopRatedMovies1: `/api/movies/top-rated?page=1`,
    fetchTopRatedMovies2: `/api/movies/top-rated?page=2`,
    fetchActionMovies: `/api/movies/genre/action`,
    fetchComedyMovies: `/api/movies/genre/comedy`,
    fetchHorrorMovies: `/api/movies/genre/horror`,
    fetchRomanceMovies: `/api/movies/genre/romance`,
    fetchDocumentaries: `/api/movies/genre/documentary`,
}

// fetchGenres: `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`,
// fetchTVByRating: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc`,

export default requests
