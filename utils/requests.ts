// Server-side API routes (no API key exposure)
const requests = {
    // Mixed content (movies + TV shows)
    fetchTrending: `/api/movies/trending`,
    fetchTopRatedMovies1: `/api/movies/top-rated?page=1`,
    fetchTopRatedMovies2: `/api/movies/top-rated?page=2`,
    fetchActionMovies: `/api/movies/genre/action`,
    fetchComedyMovies: `/api/movies/genre/comedy`,
    fetchHorrorMovies: `/api/movies/genre/horror`,
    fetchRomanceMovies: `/api/movies/genre/romance`,
    fetchDocumentaries: `/api/movies/genre/documentary`,

    // TV-specific endpoints
    fetchTrendingTV: `/api/tv/trending`,
    fetchTopRatedTV1: `/api/tv/top-rated?page=1`,
    fetchTopRatedTV2: `/api/tv/top-rated?page=2`,
    fetchActionTV: `/api/genres/tv/10759`, // Action & Adventure
    fetchComedyTV: `/api/genres/tv/35`,    // Comedy
    fetchCrimeTV: `/api/genres/tv/80`,     // Crime
    fetchDramaTV: `/api/genres/tv/18`,     // Drama
    fetchDocumentaryTV: `/api/genres/tv/99`, // Documentary

    // Movie-specific endpoints
    fetchTrendingMovies: `/api/movies/trending`,
    fetchTopRatedMovies: `/api/movies/top-rated?page=1`,
    fetchActionOnlyMovies: `/api/genres/movie/28`,     // Action
    fetchComedyOnlyMovies: `/api/genres/movie/35`,     // Comedy
    fetchHorrorOnlyMovies: `/api/genres/movie/27`,     // Horror
    fetchRomanceOnlyMovies: `/api/genres/movie/10749`, // Romance
    fetchDocumentaryOnlyMovies: `/api/genres/movie/99`, // Documentary
}

// fetchGenres: `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`,
// fetchTVByRating: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc`,

export default requests
