"use client";

import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey
      && firebaseConfig.authDomain
      && firebaseConfig.projectId
      && firebaseConfig.appId
  );
}

function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
  }
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

function shouldUseRedirectFallback(error) {
  return [
    "auth/popup-blocked",
    "auth/popup-closed-by-user",
    "auth/cancelled-popup-request",
  ].includes(error?.code);
}

export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = googleProvider();
  let credential;
  try {
    credential = await signInWithPopup(auth, provider);
  } catch (error) {
    if (!shouldUseRedirectFallback(error)) throw error;
    await signInWithRedirect(auth, provider);
    return new Promise(() => {});
  }
  return credential.user.getIdToken();
}

export async function completeGoogleRedirectSignIn() {
  const credential = await getRedirectResult(getFirebaseAuth());
  return credential?.user ? credential.user.getIdToken() : null;
}

export async function signOutFromGoogle() {
  if (!isFirebaseConfigured()) return;
  await firebaseSignOut(getFirebaseAuth());
}
