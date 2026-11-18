import { useContext } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { allRouterLink } from "../router/AllRouterLinks";

/**
 * Global auth gate (layout route).
 *
 * Every route that is NOT explicitly marked `public: true` in routes.jsx is
 * rendered inside this gate, so a logged-out user can never see any page
 * other than the public ones - they are always sent to the login page.
 * Default-deny: forgetting a flag on a new route can no longer leak a page.
 */
export const RequireAuth = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={allRouterLink.loginUser}
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

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
    return <Navigate to={allRouterLink.loginUser} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
