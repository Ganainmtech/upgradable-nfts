import { Route, Routes, BrowserRouter as Router } from "react-router-dom";
import Home from "./views/home";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

function App() {
  return (
    <div className="bg-primary-black flex flex-col min-h-screen font-roboto pb-6">
      <ToastContainer
        pauseOnFocusLoss={false}
        closeOnClick
        draggable
        pauseOnHover={false}
        position="bottom-right"
        rtl={false}
        hideProgressBar={false}
        autoClose={3500}
        newestOnTop={true}
        theme="dark"
      />
      <Router>
        <ScrollToTop />
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Footer />
      </Router>
    </div>
  );
}
export default App;
