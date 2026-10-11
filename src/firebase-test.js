import { auth, db } from "./firebase/firebase.js";
console.log("Firebase Auth connected:", !!auth);
console.log("Firestore connected:", !!db);
