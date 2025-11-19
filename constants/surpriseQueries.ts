/**
 * Curated surprise queries for the "Surprise Me" dice button
 *
 * Three categories based on context:
 * 1. HERO_SEARCH_QUERIES - For main hero search input (vibes, themes, moods)
 * 2. COLLECTION_QUERIES - For collection builder (collection ideas)
 * 3. RANKING_QUERIES - For ranking creator (ranking titles with "Best", "Top", etc.)
 *
 * Target: 200 queries per array
 */

/**
 * Hero Search Queries - Vibes, themes, moods, search concepts
 * Used in: Main hero search input
 */
export const HERO_SEARCH_QUERIES = [
    // Character archetypes
    'neo-like characters',
    'strong female leads kicking ass',
    'antiheroes finding redemption',
    'reluctant chosen ones',
    'badass mentor figures',
    'morally gray protagonists',
    'characters who break the fourth wall',
    'underdogs proving everyone wrong',
    'lone wolves forced to work together',
    'brilliant detectives with quirks',

    // Moods and vibes
    'rainy day comfort watches',
    'feel-good second chances',
    'dark and twisted minds',
    'whimsical magical realism',
    'gritty noir vibes',
    'cozy autumn evenings',
    'summer road trip energy',
    'moody atmospheric tension',
    'hopeful dystopian futures',
    'melancholic beautiful sadness',

    // Thematic searches
    'mind-bending time travel',
    'revenge with consequences',
    'survival against all odds',
    'found family dynamics',
    'AI taking over',
    'mysterious islands',
    'haunted by the past',
    'second chance at life',
    'breaking free from control',
    'questioning reality itself',

    // Genre + vibe combos
    'quirky indie rom-coms',
    'psychological thrillers that mess with your head',
    'clever heist movies',
    'dystopian futures with hope',
    'gripping true crime',
    'underdog sports comebacks',
    'animated films that hit deep',
    'detective stories with wit',
    'found footage scares',
    'buddy cop banter',

    // Actor-specific vibes
    'Keanu Reeves comedies',
    'Denzel Washington action',
    'Tom Hanks being wholesome',
    'Ryan Gosling smoldering',
    'Meryl Streep powerhouse performances',
    'Morgan Freeman narrating life',
    'Samuel L. Jackson being a badass',
    'Cate Blanchett chameleon roles',
    'Jake Gyllenhaal intensity',
    'Tilda Swinton being ethereal',

    // Director styles
    'Wes Anderson whimsy',
    'Christopher Nolan complexity',
    'Tarantino dialogue',
    'Scorsese grit',
    'Kubrick perfection',
    'Spielberg wonder',
    'Fincher darkness',
    'PTA character studies',
    'Villeneuve atmosphere',
    'Coen Brothers absurdity',

    // Time periods and nostalgia
    '80s nostalgia',
    '90s teen angst',
    '70s gritty realism',
    '60s mod aesthetics',
    '50s Americana',
    '2000s emo vibes',
    'Victorian gothic',
    'roaring twenties glamour',
    'Wild West showdowns',
    'medieval sword fights',

    // Emotional searches
    'ugly cry emotional rollercoasters',
    'laugh until it hurts',
    'edge of your seat suspense',
    'spine-tingling horror',
    'heart-pounding action',
    'butterflies in stomach romance',
    'existential dread',
    'pure adrenaline rush',
    'warming your heart',
    'keeping you guessing',

    // Specific themes
    'dragons and fantasy worlds',
    'space exploration wonder',
    'underwater mysteries',
    'royal family drama',
    'mafia family dynamics',
    'music that moves souls',
    'art world intrigue',
    'sports underdog glory',
    'courtroom drama',
    'prison survival',

    // Cultural and social
    'coming of age stories',
    'immigrant experiences',
    'LGBTQ+ representation',
    'disability representation',
    'racial justice themes',
    'feminist perspectives',
    'class struggle',
    'mental health journeys',
    'addiction recovery',
    'finding identity',

    // More specific vibes
    'trippy art films',
    'controversial biopics',
    'romantic escapes to Paris',
    'dark superheroes finding redemption',
    'epic space battles',
    'claustrophobic thrillers',
    "romantic comedies that aren't cringe",
    'war films that question war',
    'sci-fi that makes you think',
    'fantasy that takes itself seriously',
] as const

/**
 * Collection Builder Queries - Collection ideas and themes
 * Used in: Collection builder modal
 */
export const COLLECTION_QUERIES = [
    // Curated themes
    'Hidden gems from the 90s',
    'Cozy autumn comfort watches',
    'Visually stunning cinematography',
    'Female-led action movies',
    'Underrated indie darlings',
    'One-location thrillers',
    'Nonlinear storytelling',
    'Black and white masterpieces',
    'Foreign language gems',
    'Documentary-style dramas',

    // Time period collections
    'Pre-2000s sci-fi classics',
    'Golden age Hollywood',
    '80s teen movies',
    'Silent film era',
    'New Hollywood movement',
    'French New Wave',
    'Italian Neorealism',
    'Japanese Golden Age',
    'British New Wave',
    'American Independent 90s',

    // Visual and aesthetic
    'Neon-soaked cyberpunk',
    'Pastel color palettes',
    'Desert landscapes',
    'Urban dystopias',
    'Minimalist design',
    'Baroque excess',
    'Gothic architecture',
    'Retro futurism',
    'Natural lighting only',
    'Long single takes',

    // Emotional categories
    'Cathartic cry-fests',
    'Laugh therapy sessions',
    'Anxiety-inducing suspense',
    'Wholesome feel-goods',
    'Bittersweet endings',
    'Triumphant victories',
    'Thought-provoking philosophy',
    'Pure escapism',
    'Uncomfortable truths',
    'Hopeful messages',

    // Genre blends
    'Horror-comedies',
    'Sci-fi westerns',
    'Musical dramas',
    'Romantic thrillers',
    'Fantasy noir',
    'Comedy-dramas',
    'Action-comedies',
    'Thriller-romances',
    'Documentary-fiction hybrids',
    'Animated adult content',

    // Cultural themes
    'Asian cinema masterpieces',
    'African storytelling',
    'Latin American magic realism',
    'Nordic noir',
    'Australian outback tales',
    'Middle Eastern perspectives',
    'Eastern European darkness',
    'Caribbean culture',
    'Native American stories',
    'Indigenous voices',

    // Specific concepts
    'Time loop narratives',
    'Parallel universes',
    'Memory manipulation',
    'Artificial intelligence ethics',
    'Climate change themes',
    'Pandemic narratives',
    'Virtual reality',
    'Social media commentary',
    'Surveillance state',
    'Genetic engineering',

    // Mood-based
    'Sunday afternoon lazy watches',
    'Late night weird watches',
    'Date night picks',
    'Solo contemplation films',
    'Party crowd-pleasers',
    'Rainy day mysteries',
    'Summer blockbuster fun',
    'Winter holiday warmth',
    'Spring renewal stories',
    'Fall melancholy vibes',

    // Character-driven
    'Ensemble casts',
    'Solo character studies',
    'Buddy dynamics',
    'Family sagas',
    'Mentor-student relationships',
    'Rivals to allies',
    'Unreliable narrators',
    'Silent protagonists',
    'Villain protagonists',
    'Multiple perspectives',

    // Technical achievements
    'Practical effects only',
    'CGI groundbreaking',
    'Oscar-winning cinematography',
    'Innovative soundtracks',
    'Breakthrough editing',
    'Method acting performances',
    'Improvised dialogue',
    'Single-take masterpieces',
    'Pioneering special effects',
    'Revolutionary sound design',
] as const

/**
 * Ranking Creator Queries - Ranking titles using "Best", "Worst", "Top", etc.
 * Used in: Ranking creator
 */
export const RANKING_QUERIES = [
    // Best + genre
    'Best Pixar movies',
    'Best zombie movies',
    'Best heist films',
    'Best time travel movies',
    'Best superhero films',
    'Best psychological thrillers',
    'Best romantic comedies',
    'Best war movies',
    'Best westerns',
    'Best horror films',
    'Best sci-fi movies',
    'Best fantasy epics',
    'Best animated films',
    'Best documentaries',
    'Best musicals',

    // Worst + genre/actor
    'Worst Adam Sandler films',
    'Worst superhero movies',
    'Worst sequels ever made',
    'Worst remakes',
    'Worst book adaptations',
    'Worst video game movies',
    'Worst CGI disasters',
    'Worst twist endings',
    'Worst acting performances',
    'Worst movie endings',

    // Top + decade
    'Top sci-fi movies of the 90s',
    'Top action films of the 80s',
    'Top horror movies of the 2000s',
    'Top comedies of the 70s',
    'Top dramas of the 2010s',
    'Top thrillers of the 90s',
    'Top romances of the 2000s',
    'Top westerns of the 60s',
    'Top animated films of the 2010s',
    'Top foreign films of the 2000s',

    // Actor/Director filmography
    'Christopher Nolan filmography',
    'Tarantino films ranked',
    'Wes Anderson filmography',
    'Martin Scorsese films ranked',
    'Stanley Kubrick masterpieces',
    'Steven Spielberg filmography',
    'Alfred Hitchcock classics',
    'Coen Brothers filmography',
    'David Fincher films ranked',
    'Paul Thomas Anderson filmography',

    // Actor collections
    'Tom Hanks collection',
    'Denzel Washington filmography',
    'Meryl Streep performances',
    'Leonardo DiCaprio roles',
    'Al Pacino classics',
    'Robert De Niro filmography',
    'Daniel Day-Lewis performances',
    'Joaquin Phoenix roles',
    'Christian Bale transformations',
    'Gary Oldman chameleon roles',

    // Franchise rankings
    'Marvel Cinematic Universe ranked',
    'Star Wars saga ranked',
    'James Bond movies ranked',
    'Harry Potter films ranked',
    'Lord of the Rings trilogy',
    'Mission Impossible ranked',
    'Fast & Furious ranked',
    'Jurassic Park franchise',
    'Alien franchise ranked',
    'Rocky movies ranked',

    // Studio/production rankings
    'Studio Ghibli complete collection',
    'A24 films ranked',
    'Blumhouse horror ranked',
    'Disney animated classics',
    'DreamWorks Animation ranked',
    'Criterion Collection essentials',
    'Netflix originals ranked',
    'HBO prestige dramas',
    'AMC series ranked',
    'Showtime originals',

    // Specific categories
    'Best plot twists',
    'Best opening scenes',
    'Best movie soundtracks',
    'Best cinematography',
    'Best ensemble casts',
    'Best single locations',
    'Best long takes',
    'Best practical effects',
    'Best character arcs',
    'Best villain performances',

    // Era-specific
    'Golden Age Hollywood classics',
    'Silent film masterpieces',
    'Pre-code Hollywood',
    'Classic Film Noir',
    'New Hollywood movement',
    'Blockbuster era 80s',
    'Independent film boom 90s',
    'Streaming era favorites',
    '21st century classics',
    'Modern masterpieces',

    // Genre-specific superlatives
    'Scariest horror films',
    'Funniest comedies',
    'Most romantic films',
    'Most intense thrillers',
    'Most epic adventures',
    'Most thought-provoking',
    'Most visually stunning',
    'Most emotional dramas',
    'Most action-packed',
    'Most mind-bending',
] as const

/**
 * Get a random query from the specified category
 */
export function getRandomQuery(type: 'hero' | 'collection' | 'ranking'): string {
    const queries = {
        hero: HERO_SEARCH_QUERIES,
        collection: COLLECTION_QUERIES,
        ranking: RANKING_QUERIES,
    }

    const selectedArray = queries[type]
    return selectedArray[Math.floor(Math.random() * selectedArray.length)]
}

/**
 * Get current query counts for each category
 */
export function getQueryCounts() {
    return {
        hero: HERO_SEARCH_QUERIES.length,
        collection: COLLECTION_QUERIES.length,
        ranking: RANKING_QUERIES.length,
        total: HERO_SEARCH_QUERIES.length + COLLECTION_QUERIES.length + RANKING_QUERIES.length,
    }
}
