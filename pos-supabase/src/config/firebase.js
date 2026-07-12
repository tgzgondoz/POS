import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, remove, update } from 'firebase/database';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCu6tY5bP-rfuHCQnV2wJyYs9gATloxEY8",
  authDomain: "nitrogopos.firebaseapp.com",
  databaseURL: "https://nitrogopos-default-rtdb.firebaseio.com",
  projectId: "nitrogopos",
  storageBucket: "nitrogopos.firebasestorage.app",
  messagingSenderId: "222524538533",
  appId: "1:222524538533:web:7d52045eb768582571d74c",
  measurementId: "G-93B8P5DJQ2"
};

let app = null;
let database = null;
let auth = null;

export const initializeFirebase = () => {
  try {
    if (!app) {
      console.log('Initializing Firebase...');
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      auth = getAuth(app);
      console.log('Firebase initialized successfully');
    }
    return { app, database, auth };
  } catch (error) {
    console.error('Firebase initialization error details:', error);
    throw error;
  }
};

export const getDatabaseInstance = () => {
  if (!database) {
    initializeFirebase();
  }
  return database;
};

export const getAuthInstance = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};

// Authentication functions
export const loginWithEmail = async (email, password) => {
  try {
    const authInstance = getAuthInstance();
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const registerWithEmail = async (email, password) => {
  try {
    const authInstance = getAuthInstance();
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    const authInstance = getAuthInstance();
    await signOut(authInstance);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};

// Database helper functions
export const saveData = async (path, data) => {
  const db = getDatabaseInstance();
  const reference = ref(db, path);
  await set(reference, data);
};

export const pushData = async (path, data) => {
  const db = getDatabaseInstance();
  const reference = ref(db, path);
  const newRef = push(reference);
  await set(newRef, data);
  return newRef.key;
};

export const updateData = async (path, data) => {
  const db = getDatabaseInstance();
  const reference = ref(db, path);
  await update(reference, data);
};

export const deleteData = async (path) => {
  const db = getDatabaseInstance();
  const reference = ref(db, path);
  await remove(reference);
};

export const listenToData = (path, callback) => {
  const db = getDatabaseInstance();
  const reference = ref(db, path);
  return onValue(reference, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};

// Export all the functions you need
export { ref, set, push, onValue, remove, update };