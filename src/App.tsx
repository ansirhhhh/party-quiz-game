import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Player from "./pages/Player";
import Host from "./pages/Host";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/player" element={<Player />} />
      <Route path="/host" element={<Host />} />
    </Routes>
  );
}
