const API_KEY = process.env.NEXT_PUBLIC_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

const requests = {
    //update requests to get 30 items instead of 20
    fetchTrending: `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`,
    fetchTopRatedMovies1: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=1`,
    fetchTopRatedMovies2: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=2`,
    fetchActionMovies: `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=28`,
    fetchComedyMovies: `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=35`,
    fetchHorrorMovies: `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=27`,
    fetchRomanceMovies: `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=10749`,
    fetchDocumentaries: `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&with_genres=99`,
    fetchTopRatedTV: `${BASE_URL}/tv/top_rated?api_key=${API_KEY}&language=en-US`,
    fetchActionTV: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=28`,
    fetchComedyTV: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=35`,
    fetchHorrorTV: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&with_genres=27`,
}

// fetchGenres: `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`,
// fetchTVByRating: `${BASE_URL}/discover/tv?api_key=${API_KEY}&language=en-US&sort_by=vote_average.desc`,

export default requests
