import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Chat } from "./pages/Chat";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Billing from "./pages/Billing";

import "./App.css";
import { SignedOut, SignedIn } from "@clerk/clerk-react";

function App() {
  return (
    <Router basename={import.meta.env.VITE_BASE_PATH || "/"}>
      <Routes>
        {/* Redirect root based on auth status */}
        <Route
          path="/"
          element={
            <>
              <SignedIn>
                <Navigate to="/chat" />
              </SignedIn>
              <SignedOut>
                <Navigate to="/login" />
              </SignedOut>
            </>
          }
        />

        {/* Public routes only accessible if signed out */}
        <Route
          path="/login"
          element={
            <SignedOut>
              <Login />
            </SignedOut>
          }
        />
        <Route
          path="/register"
          element={
            <SignedOut>
              <Register />
            </SignedOut>
          }
        />

        {/* Protected routes only accessible if signed in */}
        <Route
          path="/chat"
          element={
            <SignedIn>
              <Chat />
            </SignedIn>
          }
        />
        <Route
          path="/billing"
          element={
            <SignedIn>
              <Billing />
            </SignedIn>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
