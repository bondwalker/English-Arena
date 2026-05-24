import { useState } from "react";
import css from "./styles/css.js";
import Home from "./components/Home.jsx";
import HostView from "./components/HostView.jsx";
import StudentView from "./components/StudentView.jsx";
import SoloView from "./components/SoloView.jsx";

export default function App() {
  const joinCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("join") || "") : "";
  const [view, setView] = useState(joinCode ? "student" : "home");
  return (
    <>
      <style>{css}</style>
      {view === "home"    && <Home    onHost={() => setView("host")} onJoin={() => setView("student")} onSolo={() => setView("solo")} />}
      {view === "host"    && <HostView    onBack={() => setView("home")} />}
      {view === "student" && <StudentView onBack={() => setView("home")} initialCode={joinCode} />}
      {view === "solo"    && <SoloView    onBack={() => setView("home")} />}
    </>
  );
}
