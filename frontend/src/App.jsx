import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Chat } from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { Layout } from "./layouts/Layout";
import { UserLayout } from "./layouts/UserLayout";

import "./App.css";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes for signed out users */}
        <Route
          path="/"
          element={
            <SignedOut>
              <Layout />
            </SignedOut>
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Protected routes for signed in users */}

        <Route path="/chat" element={<Chat />} />
      </Routes>
    </Router>
  );
}

export default App;
