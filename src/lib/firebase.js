import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, update } from "firebase/database";

let db = null;
try {
  const cfg = {
    apiKey:      import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:  import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId:   import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };
  if (cfg.apiKey && cfg.databaseURL) db = getDatabase(initializeApp(cfg));
} catch {}

export { db, ref, set, get, onValue, update };

export const fetchRoom = async (code) => {
  if (!db) return null;
  try {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 8000));
    const snap = await Promise.race([get(ref(db, `rooms/${code}`)), timeout]);
    return snap.exists() ? snap.val() : null;
  } catch { return null; }
};

export const listenRoom = (code, cb) => {
  if (!db) return () => {};
  return onValue(ref(db, `rooms/${code}`), (s) => { if (s.exists()) cb(s.val()); });
};
