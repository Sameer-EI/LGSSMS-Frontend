"use client";
import { ErrorBoundary } from '@sentry/react';
import { Routes, Route, useLocation } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { routes } from "./routes";
import { ProtectedRoute } from "../protectedRoutes/Protected";
import { NotFound } from "../components/NotFound";
import { allRouterLink } from "./AllRouterLinks";
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
   
        

        {/* All authenticated routes */}
        <Route element={<MainLayout />}>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                route.protected ? (
                  <ProtectedRoute allowedRoles={route.allowedRoles}>
                    {route.element}
                  </ProtectedRoute>
                ) : (
                  route.element
                )
              }
            />
          ))}
        </Route>

        <Route path={allRouterLink.notFound} element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
