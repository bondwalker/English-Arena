import { db, ref, set } from "./firebase.js";

const STORE_KEY = "englishgame_v2";
const FAVES_KEY = "englishgame_faves";
const FONT_KEY  = "englishgame_font";

export const read = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || "null"); } catch { return null; } };

export const write = (v) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(v));
  if (db && v?.code) set(ref(db, `rooms/${v.code}`), v).catch(() => {});
};

export const readFaves  = () => { try { return JSON.parse(localStorage.getItem(FAVES_KEY) || "[]"); } catch { return []; } };
export const writeFaves = (v) => { try { localStorage.setItem(FAVES_KEY, JSON.stringify(v)); } catch {} };
export const readFont   = () => { try { return localStorage.getItem(FONT_KEY) === "large"; } catch { return false; } };
export const writeFont  = (v) => { try { localStorage.setItem(FONT_KEY, v ? "large" : "normal"); } catch {} };
