// Initialize Firebase
import { initializeApp, getApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: 'AIzaSyAUnk_RlyFa7BzLuhiadzy32iyBDKCcYSE',
    authDomain: 'netflix-clone-15862.firebaseapp.com',
    projectId: 'netflix-clone-15862',
    storageBucket: 'netflix-clone-15862.appspot.com',
    messagingSenderId: '1090225576232',
    appId: '1:1090225576232:web:4db337ae40f1de7aa5181d',
}

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore()
const auth = getAuth()

export default app
export { auth, db }
