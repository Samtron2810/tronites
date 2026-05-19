import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Navbar from "./components/Navbar";

import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  const location = useLocation();

  //display the navbar on all pages except login and register
  const ShowNavbar = !["/login", "/signup"].includes(location.pathname);

  return (
    <BrowserRouter>
      {ShowNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Register />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
