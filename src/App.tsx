import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { CompleteProfileModal } from "./components/CompleteProfileModal";
import { isProfileComplete } from "./lib/profile";
import { ChatPage } from "./pages/ChatPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";

function LoadingScreen() {
  return (
    <div className="center" style={{ minHeight: "100vh" }}>
      <span className="spinner" />
      Memuat…
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (token) return <Navigate to="/chat" replace />;
  return <>{children}</>;
}

function Home() {
  const { token } = useAuth();
  return <Navigate to={token ? "/chat" : "/login"} replace />;
}

export default function App() {
  const { token, profile } = useAuth();
  const needsProfile = Boolean(token && profile && !isProfileComplete(profile));

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          }
        />
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <ChatPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Home />} />
      </Routes>

      {needsProfile && <CompleteProfileModal />}
    </>
  );
}
