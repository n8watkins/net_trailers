# 🎬 NetTrailer

**Full-Stack Movie Discovery Platform**

A Netflix-inspired streaming platform built with modern web technologies, featuring user authentication, movie discovery, and a responsive design.

## 🚀 Tech Stack

<div align="center">

| Frontend          | Backend              | Database         | APIs        | Styling             | State Management |
| ----------------- | -------------------- | ---------------- | ----------- | ------------------- | ---------------- |
| ▲ **Next.js**     | 🔥 **Firebase**      | 🔥 **Firestore** | 🎬 **TMDB** | 🎨 **Tailwind CSS** | ⚛️ **Recoil**    |
| **TS TypeScript** | 🔐 **Firebase Auth** |                  |             | 🎭 **Material-UI**  |                  |
| ⚛️ **React 18**   |                      |                  |             | 🦸 **Heroicons**    |                  |

</div>

## ✨ Features

- **🔐 Multi-Provider Authentication**
    - Email/Password signup & login
    - Google OAuth integration
    - Discord OAuth integration
    - Twitter/X OAuth integration
    - Guest mode for demo access

- **🎬 Movie Discovery**
    - Browse trending movies
    - Search functionality
    - Movie details with trailers
    - Personalized recommendations

- **👤 User Experience**
    - Responsive design for all devices
    - Netflix-inspired UI/UX
    - Real-time data synchronization
    - Error handling and loading states

- **🛠 Developer Features**
    - TypeScript for type safety
    - ESLint for code quality
    - Recoil for state management
    - Optimized performance

## 🎯 Live Demo

[🚀 **Try NetTrailer Live**](https://your-deployment-url.com)

_Experience all features or continue as guest to explore the platform_

## 🛠 Installation & Setup

1. **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/net_trailer.git
    cd net_trailer
    ```

2. **Install dependencies**

    ```bash
    npm install
    # or
    pnpm install
    ```

3. **Environment Variables**
   Create a `.env.local` file in the root directory:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
    ```

4. **Run the development server**

    ```bash
    npm run dev
    # or
    pnpm dev
    ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 🔧 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run type-check # Run TypeScript checks
```

## 🏗 Project Structure

```
net_trailer/
├── components/          # Reusable UI components
├── pages/              # Next.js pages and API routes
├── hooks/              # Custom React hooks
├── atoms/              # Recoil state atoms
├── utils/              # Utility functions
├── styles/             # Global styles and Tailwind CSS
└── public/             # Static assets
```

## 🔑 Key Components

- **Authentication System**: Multi-provider OAuth with Firebase
- **Movie Catalog**: Integration with TMDB API for movie data
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **State Management**: Recoil for global state and user data
- **Unified Toast System**: Single notification system for all user feedback
- **Error Handling**: Comprehensive error boundaries and user feedback

## 🎨 Toast Notification System

The application features a unified toast notification system that provides consistent user feedback across all interactions:

### Toast Types

- **Success** (`success`) - Green checkmark for successful operations
- **Error** (`error`) - Red X mark for error messages
- **Watchlist Add** (`watchlist-add`) - Blue plus icon for adding to watchlist
- **Watchlist Remove** (`watchlist-remove`) - Orange minus icon for removing from watchlist
- **Content Hidden** (`content-hidden`) - Red eye-slash for hiding content
- **Content Shown** (`content-shown`) - Green eye for showing content

### Usage

```typescript
import { useToast } from '../hooks/useToast'

const { showSuccess, showError, showWatchlistAdd } = useToast()

// Success notification
showSuccess('Operation completed', 'Optional description')

// Error notification
showError('Something went wrong', 'Error details')

// Watchlist operations
showWatchlistAdd('Added to watchlist', 'Movie title added')
```

### Architecture

- **Toast.tsx** - Individual toast component with animations and auto-dismiss
- **ToastContainer.tsx** - Positioning and layout (right-aligned with responsive margins)
- **ToastManager.tsx** - Bridge between Recoil state and React components
- **useToast.ts** - Hook providing simple API for showing toasts
- **toastAtom.ts** - Recoil state management (single toast display)

### Error Handling Integration

The `ErrorHandler` class automatically converts all application errors into toast notifications:

- Authentication errors → Error toasts
- API failures → Error toasts
- Network issues → Error toasts
- Validation errors → Error toasts

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the comprehensive movie database API
- [Firebase](https://firebase.google.com/) for backend services
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

---

<div align="center">

**Built with ❤️ using modern web technologies**

[🔗 Portfolio](https://your-portfolio.com) • [💼 LinkedIn](https://linkedin.com/in/yourprofile) • [🐦 Twitter](https://twitter.com/yourhandle)

</div>
