import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { allRouterLink } from "../router/AllRouterLinks";

// export const ProtectedRoute = ({ children, allowedRoles }) => {
//   const { isAuthenticated, userRole } = useContext(AuthContext);

//   if (!allowedRoles) {
//     return isAuthenticated ? children : <Navigate to={allRouterLink.unAuthorized} replace />;
//   }

//   if (!isAuthenticated) {
//     return <Navigate to={allRouterLink.unAuthorized} replace />;
//   }

//   if (!allowedRoles.includes(userRole)) {
//     return <Navigate to={allRouterLink.unAuthorized} replace />;
//   }

//   return children;
// };

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
