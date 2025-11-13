/**
 * Forum Seed Data
 *
 * Dummy data for testing forum and poll features
 */

import { Thread, Poll, ForumCategory } from '@/types/forum'
import { Timestamp } from 'firebase/firestore'

// Helper to create timestamps
const daysAgo = (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return Timestamp.fromDate(date)
}

const hoursAgo = (hours: number) => {
    const date = new Date()
    date.setHours(date.getHours() - hours)
    return Timestamp.fromDate(date)
}

export const SEED_THREADS: Thread[] = [
    {
        id: 'thread-1',
        title: 'What are your thoughts on the new Dune Part 2?',
        content:
            "Just watched Dune Part 2 and I'm blown away! The visuals were stunning and the story kept me engaged throughout. What did everyone else think? I especially loved the desert battle scenes.",
        category: 'movies',
        userId: 'user-1',
        userName: 'MovieBuff92',
        userAvatar: undefined,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
        isPinned: false,
        isLocked: false,
        views: 234,
        replyCount: 18,
        lastReplyAt: hoursAgo(3),
        lastReplyBy: {
            userId: 'user-5',
            userName: 'SciFiFan',
        },
        tags: ['dune', 'sci-fi', 'discussion'],
        likes: 45,
    },
    {
        id: 'thread-2',
        title: 'Best TV shows of 2024 so far?',
        content:
            "We're halfway through 2024 and there have been some incredible shows. What are your top picks? Mine are The Bear Season 3, Shogun, and True Detective Night Country.",
        category: 'tv-shows',
        userId: 'user-2',
        userName: 'TVAddict',
        userAvatar: undefined,
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
        isPinned: true,
        isLocked: false,
        views: 567,
        replyCount: 42,
        lastReplyAt: hoursAgo(1),
        lastReplyBy: {
            userId: 'user-3',
            userName: 'BingeWatcher',
        },
        tags: ['2024', 'tv-shows', 'recommendations'],
        likes: 89,
    },
    {
        id: 'thread-3',
        title: 'Looking for hidden gem horror movies',
        content:
            "I've watched all the popular horror films and I'm looking for some underrated gems. Any recommendations for lesser-known horror movies that deserve more attention?",
        category: 'recommendations',
        userId: 'user-3',
        userName: 'HorrorFanatic',
        userAvatar: undefined,
        createdAt: daysAgo(1),
        updatedAt: daysAgo(1),
        isPinned: false,
        isLocked: false,
        views: 156,
        replyCount: 27,
        lastReplyAt: hoursAgo(6),
        lastReplyBy: {
            userId: 'user-7',
            userName: 'CinemaLover',
        },
        tags: ['horror', 'recommendations', 'hidden-gems'],
        likes: 32,
    },
    {
        id: 'thread-4',
        title: 'Ranking Nolan films - Let the debates begin!',
        content:
            "I just finished rewatching all of Christopher Nolan's films and I'm curious how everyone would rank them. My personal top 3 are: 1. The Prestige, 2. Interstellar, 3. Inception. Fight me!",
        category: 'rankings',
        userId: 'user-4',
        userName: 'NolanFan',
        userAvatar: undefined,
        createdAt: hoursAgo(12),
        updatedAt: hoursAgo(12),
        isPinned: false,
        isLocked: false,
        views: 423,
        replyCount: 56,
        lastReplyAt: hoursAgo(2),
        lastReplyBy: {
            userId: 'user-9',
            userName: 'FilmCritic',
        },
        tags: ['christopher-nolan', 'rankings', 'debate'],
        likes: 78,
    },
    {
        id: 'thread-5',
        title: 'Welcome to the Community Forums!',
        content:
            'Welcome everyone! This is a space to discuss movies, TV shows, share recommendations, and connect with fellow film enthusiasts. Please be respectful and have fun!',
        category: 'announcements',
        userId: 'admin',
        userName: 'Admin',
        userAvatar: undefined,
        createdAt: daysAgo(30),
        updatedAt: daysAgo(30),
        isPinned: true,
        isLocked: false,
        views: 1205,
        replyCount: 15,
        lastReplyAt: daysAgo(15),
        lastReplyBy: {
            userId: 'user-12',
            userName: 'NewMember',
        },
        tags: ['welcome', 'announcement'],
        likes: 124,
    },
    {
        id: 'thread-6',
        title: 'Anyone else disappointed with the Marvel Phase 5?',
        content:
            "I've been a huge MCU fan since the beginning, but Phase 5 hasn't been hitting the same for me. The storytelling feels rushed and the character development is lacking. Am I alone in this?",
        category: 'movies',
        userId: 'user-6',
        userName: 'MarvelFan2008',
        userAvatar: undefined,
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
        isPinned: false,
        isLocked: false,
        views: 892,
        replyCount: 134,
        lastReplyAt: hoursAgo(4),
        lastReplyBy: {
            userId: 'user-11',
            userName: 'ComicBookGuy',
        },
        tags: ['marvel', 'mcu', 'discussion'],
        likes: 156,
    },
]

export const SEED_POLLS: Poll[] = [
    {
        id: 'poll-1',
        question: 'What is the best Christopher Nolan film?',
        description: 'Cast your vote for the greatest Nolan masterpiece!',
        category: 'movies',
        userId: 'user-2',
        userName: 'CinemaPoll',
        userAvatar: undefined,
        createdAt: daysAgo(4),
        expiresAt: undefined,
        options: [
            { id: 'opt-1', text: 'The Dark Knight', votes: 145, percentage: 35 },
            { id: 'opt-2', text: 'Inception', votes: 98, percentage: 24 },
            { id: 'opt-3', text: 'Interstellar', votes: 87, percentage: 21 },
            { id: 'opt-4', text: 'The Prestige', votes: 56, percentage: 14 },
            { id: 'opt-5', text: 'Oppenheimer', votes: 25, percentage: 6 },
        ],
        totalVotes: 411,
        isMultipleChoice: false,
        allowAddOptions: false,
        tags: ['nolan', 'movies', 'poll'],
    },
    {
        id: 'poll-2',
        question: 'Which streaming service has the best original content?',
        description: 'Time to settle this debate once and for all!',
        category: 'tv-shows',
        userId: 'user-5',
        userName: 'StreamingDebate',
        userAvatar: undefined,
        createdAt: daysAgo(1),
        expiresAt: undefined,
        options: [
            { id: 'opt-1', text: 'Netflix', votes: 78, percentage: 28 },
            { id: 'opt-2', text: 'HBO Max', votes: 92, percentage: 33 },
            { id: 'opt-3', text: 'Apple TV+', votes: 45, percentage: 16 },
            { id: 'opt-4', text: 'Disney+', votes: 38, percentage: 14 },
            { id: 'opt-5', text: 'Amazon Prime', votes: 25, percentage: 9 },
        ],
        totalVotes: 278,
        isMultipleChoice: false,
        allowAddOptions: false,
        tags: ['streaming', 'tv-shows', 'debate'],
    },
    {
        id: 'poll-3',
        question: 'What genres do you want to see more of? (Select all)',
        description: 'Help us understand what the community loves!',
        category: 'general',
        userId: 'user-1',
        userName: 'CommunityManager',
        userAvatar: undefined,
        createdAt: hoursAgo(18),
        expiresAt: undefined,
        options: [
            { id: 'opt-1', text: 'Sci-Fi', votes: 156, percentage: 45 },
            { id: 'opt-2', text: 'Horror', votes: 134, percentage: 39 },
            { id: 'opt-3', text: 'Thriller', votes: 112, percentage: 32 },
            { id: 'opt-4', text: 'Comedy', votes: 98, percentage: 28 },
            { id: 'opt-5', text: 'Documentary', votes: 67, percentage: 19 },
        ],
        totalVotes: 347,
        isMultipleChoice: true,
        allowAddOptions: false,
        tags: ['genres', 'preferences', 'community'],
    },
    {
        id: 'poll-4',
        question: 'Best animated movie of all time?',
        description: undefined,
        category: 'movies',
        userId: 'user-8',
        userName: 'AnimationFan',
        userAvatar: undefined,
        createdAt: daysAgo(7),
        expiresAt: undefined,
        options: [
            { id: 'opt-1', text: 'Spirited Away', votes: 89, percentage: 31 },
            { id: 'opt-2', text: 'The Lion King', votes: 67, percentage: 23 },
            { id: 'opt-3', text: 'Toy Story', votes: 54, percentage: 19 },
            { id: 'opt-4', text: 'Spider-Verse', votes: 78, percentage: 27 },
        ],
        totalVotes: 288,
        isMultipleChoice: false,
        allowAddOptions: false,
        tags: ['animation', 'movies', 'classic'],
    },
]

// Function to load seed data into the forum store
export function loadSeedData() {
    return {
        threads: SEED_THREADS,
        polls: SEED_POLLS,
    }
}
