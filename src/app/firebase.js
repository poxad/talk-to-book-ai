// firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyA4qaAp1QQy1cVG8EgRQNaHeCqycgUJ27E",
    authDomain: "talk-to-book-ai.firebaseapp.com",
    projectId: "talk-to-book-ai",
    storageBucket: "talk-to-book-ai.firebasestorage.app",
    messagingSenderId: "817589069977",
    appId: "1:817589069977:web:8b16e6095edec7c1f87008",
    measurementId: "G-XN1K41DHZ2"
  };

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };