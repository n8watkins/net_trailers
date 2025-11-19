/**
 * Curated surprise queries for the "Surprise Me" dice button
 *
 * Three categories based on context:
 * 1. HERO_SEARCH_QUERIES - For main hero search input (vibes, themes, moods) - 200 queries
 * 2. COLLECTION_QUERIES - For collection builder (collection ideas) - 200 queries
 * 3. RANKING_QUERIES - For ranking creator (rankable topics) - 200 queries
 *
 * Total: 600 curated queries for instant, diverse surprise suggestions
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

    // More specific moods and atmospheres
    'neon-lit nocturnal vibes',
    'sun-drenched summer nostalgia',
    'foggy mysterious mornings',
    'small town secrets',
    'big city loneliness',
    'coastal town melancholy',
    'desert isolation',
    'snowy cabin coziness',
    'urban decay aesthetics',
    'suburban dystopia',

    // More character journeys and transformations
    'redemption arcs that earn it',
    'revenge that consumes everything',
    'corruption of innocence',
    'fall from grace',
    'rising from rock bottom',
    'identity crisis journeys',
    'double lives unraveling',
    'secrets that destroy families',
    'truth at any cost',
    'power corrupts absolutely',

    // Relationship dynamics
    'toxic love that destroys',
    'platonic soulmates',
    'enemies to lovers',
    'mentor betrayal',
    'sibling rivalry turned deadly',
    'forbidden love worth dying for',
    'friendship that survives anything',
    'love triangles done right',
    'family secrets tearing them apart',
    'unlikely partnerships that work',

    // Profession and workplace dynamics
    'journalists uncovering truth',
    'teachers changing lives',
    'doctors making impossible choices',
    'lawyers bending ethics',
    'artists struggling for recognition',
    'chefs perfecting their craft',
    'musicians finding their voice',
    'writers battling demons',
    'entrepreneurs risking everything',
    'cops questioning the system',

    // More location and setting vibes
    'trapped in one location',
    'road trips that change everything',
    'small town with dark secrets',
    'haunted houses with history',
    'luxury that hides darkness',
    'poverty with dignity',
    'rural americana gothic',
    'international espionage glamour',
    'underground subcultures',
    'remote research stations',

    // Social commentary and current issues
    'tech dystopia warnings',
    'wealth inequality rage',
    'environmental collapse anxiety',
    'media manipulation paranoia',
    'corporate greed consequences',
    'political corruption exposés',
    'immigration stories',
    'generational trauma healing',
    'systemic injustice fights',
    'conspiracy theories proven right',

    // Visual and aesthetic styles
    'symmetrical compositions',
    'handheld chaos energy',
    'slow-motion beauty',
    'split-screen storytelling',
    'first-person perspective',
    'unreliable narrator visuals',
    'color-coded symbolism',
    'practical stunts only',
    'one-shot wonders',
    'aspect ratio changes',

    // More genre-mood combinations
    'cozy mysteries with tea',
    'violent ballets',
    'philosophical action',
    'romantic thrillers',
    'comedic horror',
    'tragic superheroes',
    'hopeful post-apocalypse',
    'lighthearted noir',
    'serious animated drama',
    'musical tragedy',

    // Deeper era and cultural cuts
    'prohibition era gangsters',
    'cold war paranoia',
    'post-9/11 anxiety',
    'dot-com bubble excess',
    'grunge era angst',
    'disco era decadence',
    'punk rock rebellion',
    'golden age of hip-hop',
    'rave culture euphoria',
    'mall culture nostalgia',
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

    // More decade-specific collections
    '1920s silent cinema',
    '1930s pre-code Hollywood',
    '1940s wartime cinema',
    '1950s Technicolor spectacles',
    '1960s counterculture films',
    '1970s New Hollywood',
    '1980s VHS cult classics',
    '1990s indie boom',
    '2000s digital revolution',
    '2010s streaming originals',

    // More country/region cinema
    'Korean revenge thrillers',
    'Spanish surrealism',
    'German expressionism',
    'Iranian social realism',
    'Brazilian favela stories',
    'Indian parallel cinema',
    'Hong Kong action classics',
    'Polish cinema masterworks',
    'Mexican new wave',
    'Australian New Wave',

    // Subgenre deep dives
    'Slow burn horror',
    'Folk horror',
    'Body horror',
    'Cosmic horror',
    'Slasher classics',
    'Found footage evolution',
    'Mockumentaries',
    'Cyberpunk dystopias',
    'Space opera epics',
    'Time loop narratives',

    // Technical and craft-focused
    'Practical effects masterpieces',
    'Miniature model work',
    'Stop-motion animation',
    'Rotoscope animation',
    'Motion capture performances',
    'Dolly zoom moments',
    'Dutch angle cinematography',
    'Natural light only',
    'Handheld camera work',
    'Steadicam innovations',

    // Music and soundtrack focused
    'Iconic movie soundtracks',
    'Classical music showcases',
    'Jazz-infused narratives',
    'Rock and roll biographies',
    'Hip-hop culture films',
    'Country music stories',
    'Electronic music visuals',
    'Musical performance documentaries',
    'Songs that define scenes',
    'Needle drop masters',

    // Narrative structure experiments
    'Anthology films',
    'Reverse chronology',
    'Real-time narratives',
    'Stream of consciousness',
    'Rashomon effect stories',
    'Circular narratives',
    'Episodic structures',
    'Vignette collections',
    'Parallel storylines',
    'Nested narratives',

    // Award and recognition based
    "Palme d'Or winners",
    'Sundance breakthroughs',
    'Venice Film Festival gems',
    'Cannes controversy',
    'Independent Spirit winners',
    'BAFTA best pictures',
    'Golden Globe winners',
    'SAG ensemble casts',
    'Directors Guild picks',
    'Writers Guild originals',

    // Character-type collections
    'Antihero protagonists',
    'Unreliable narrators',
    'Child protagonists',
    'Elderly leads',
    'Ensemble masterclasses',
    'Dual role performances',
    'Breakout debut roles',
    'Career-defining performances',
    'Physical transformation roles',
    'Method acting extremes',

    // Tone and atmosphere collections
    'Dreamlike surrealism',
    'Kitchen sink realism',
    'Magic realism',
    'Absurdist comedy',
    'Deadpan humor',
    'Gallows humor',
    'Whimsical fantasy',
    'Gritty naturalism',
    'Heightened reality',
    'Theatrical staging',

    // More cultural and social themes
    'Working class struggles',
    'Upper class decay',
    'Suburban nightmares',
    'Urban renewal stories',
    'Rural exodus narratives',
    'Gentrification tales',
    'Economic collapse',
    'Labor movement films',
    'Education system critiques',
    'Healthcare system dramas',
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

    // More actor filmographies
    'Brad Pitt filmography',
    'Cate Blanchett performances',
    'Ryan Gosling roles',
    'Scarlett Johansson filmography',
    'Matthew McConaughey renaissance',
    'Jennifer Lawrence filmography',
    'Michael Fassbender roles',
    'Natalie Portman performances',
    'Jake Gyllenhaal filmography',
    'Saoirse Ronan performances',
    'Oscar Isaac roles',
    'Charlize Theron filmography',
    'Mahershala Ali performances',
    'Viola Davis filmography',
    'Idris Elba roles',
    'Tessa Thompson filmography',
    'John Boyega performances',
    'Florence Pugh filmography',
    'Timothée Chalamet roles',
    'Zendaya performances',

    // More director filmographies
    'Denis Villeneuve films ranked',
    'Bong Joon-ho filmography',
    'Guillermo del Toro films ranked',
    'Jordan Peele filmography',
    'Greta Gerwig films ranked',
    'Ari Aster filmography',
    'Robert Eggers films ranked',
    'James Cameron filmography',
    'Ridley Scott films ranked',
    'Michael Mann filmography',
    'Terrence Malick films ranked',
    'Park Chan-wook filmography',
    'Wong Kar-wai films ranked',
    'Spike Lee joints ranked',
    'David Lynch filmography',

    // More franchise rankings
    'Bourne franchise ranked',
    'The Conjuring universe ranked',
    'John Wick series ranked',
    'Planet of the Apes ranked',
    'Terminator franchise ranked',
    'Mad Max films ranked',
    'Predator series ranked',
    'Alien franchise ranked',
    'The Matrix trilogy ranked',
    'Pirates of the Caribbean ranked',
    'X-Men films ranked',
    'Spider-Man movies ranked',
    'Batman films ranked',
    'Superman movies ranked',
    'Toy Story franchise ranked',

    // Genre-specific rankings
    'Best disaster movies',
    'Best vampire films',
    'Best werewolf movies',
    'Best haunted house films',
    'Best alien invasion movies',
    'Best prison escape films',
    'Best courtroom dramas',
    'Best political thrillers',
    'Best con artist movies',
    'Best amnesia thrillers',
    'Best dystopian futures',
    'Best post-apocalyptic films',
    'Best survival movies',
    'Best shark movies',
    'Best dinosaur films',

    // Decade-specific rankings
    'Best films of the 1920s',
    'Best films of the 1930s',
    'Best films of the 1940s',
    'Best films of the 1950s',
    'Best films of the 1960s',
    'Best films of the 2010s',
    'Best films of the 2020s so far',
    'Worst films of the 2000s',
    'Worst films of the 2010s',
    'Most overrated of each decade',

    // TV show rankings
    'Best prestige dramas',
    'Best sitcoms of all time',
    'Best limited series',
    'Best miniseries',
    'Best anthology series',
    'Breaking Bad episodes ranked',
    'The Sopranos episodes ranked',
    'The Wire seasons ranked',
    'Game of Thrones seasons ranked',
    'Stranger Things seasons ranked',
    'Black Mirror episodes ranked',
    'True Detective seasons ranked',
    'Fargo seasons ranked',
    'Better Call Saul seasons ranked',
    'The Crown seasons ranked',

    // Specific performance types
    'Best voice acting performances',
    'Best child actor performances',
    'Best villain performances',
    'Best supporting actor turns',
    'Best ensemble performances',
    'Best comedic performances',
    'Best dramatic performances',
    'Best action star performances',
    'Best accent work',
    'Best physical transformations',

    // More specific rankings
    'Most satisfying endings',
    'Most devastating endings',
    'Best opening sequences',
    'Best final shots',
    'Best needle drops',
    'Most iconic quotes',
    'Best plot twists ranked',
    'Most shocking deaths',
    'Best fight choreography',
    'Best car chase scenes',
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
