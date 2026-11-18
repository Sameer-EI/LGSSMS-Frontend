"use client";
import { ErrorBoundary } from '@sentry/react';
import { Routes, Route, useLocation } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { routes } from "./routes";
import { ProtectedRoute, RequireAuth } from "../protectedRoutes/Protected";
import { NotFound } from "../components/NotFound";
import { Login } from "../screens/Auth/Login";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { StudentDashboard } from "../components/Student Dashboard/StudentDashboard";
import { DirectorDashboard } from "../components/DirectorDashboard/DirectorDashboard";
import { OfficeStaffDashboard } from "../components/OfficestaffDashboard/OfficeStaffDashboard";
import { GuardianDashboard } from "../components/GuardianDashboard/GuardianDashboard";
import { TeacherDashboard } from "../components/TeacherDashboard/TeacherDashboard";
import ErrorFallBack from "../components/ErrorFallBack";

function getDashboardForRole(role) {
  switch (role) {
    case "student":
      return <StudentDashboard />;
    case "director":
      return <DirectorDashboard />;
    case "office staff":
      return <OfficeStaffDashboard />;
    case "guardian":
      return <GuardianDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    default:
      return <NotFound />;
  }
}

// Default-deny: a route is public ONLY if it explicitly says `public: true`.
// Anything else (including routes with no flag at all) requires login.
const publicRoutes = routes.filter((route) => route.public === true);
const privateRoutes = routes.filter((route) => route.public !== true);

export default function AppRouter() {
  const { isAuthenticated, userRole } = useContext(AuthContext);
  const location = useLocation();

  return (
    <ErrorBoundary fallback={<ErrorFallBack/>} resetKeys={[location.pathname]}>
      <Routes>
        
        {/* Login page outside MainLayout */}
        {!isAuthenticated ? (
          <Route path="/" element={<Login />} />
        ) : (
          <Route element={<MainLayout />}>
            <Route path="/" element={getDashboardForRole(userRole)} />
          </Route>
        )}

        <Route path="/login" element={<Login />} />

        {/* PUBLIC pages: the only pages reachable while logged out
            (routes explicitly flagged `public: true` in routes.jsx) */}
        <Route element={<MainLayout />}>
          {publicRoutes.map((route, i) => (
            <Route
              key={`${route.path}-${i}`}
              path={route.path}
              element={route.element}
            />
          ))}
        </Route>

        {/* EVERYTHING ELSE is behind the global auth gate. Not logged in
            => redirected to /login, no matter which URL was typed
            (known pages, role pages, and unknown URLs alike). */}
        <Route element={<RequireAuth />}>
          <Route element={<MainLayout />}>
            {privateRoutes.map((route, i) => (
              <Route
                key={`${route.path}-${i}`}
                path={route.path}
                element={
                  <ProtectedRoute allowedRoles={route.allowedRoles}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
