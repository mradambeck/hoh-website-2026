import { Route, Routes } from "react-router-dom";
import Nav from "./components/nav/Nav";
import Footer from "./components/footer/Footer";
import HomePage from "./pages/home/HomePage";
import LivePage from "./pages/live/LivePage";
import MusicPage from "./pages/music/MusicPage";
import VideoPage from "./pages/video/VideoPage";
import ContactPage from "./pages/contact/ContactPage";
import NotFoundPage from "./pages/not-found/NotFoundPage";
import styles from "./App.module.css";

function App() {
  return (
    <>
      <Nav />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/live" element={<LivePage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/video" element={<VideoPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;
