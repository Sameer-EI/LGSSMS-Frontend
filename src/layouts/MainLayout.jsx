// import React, { useContext } from "react";
// import { Navbar } from "../components/Navbar";
// import { Outlet, useLocation } from "react-router-dom";
// import { NetWorkContext } from "../context/NetworkContext";
// import { Sidebar } from "../components/Sidebar";
// import Noconnection from "../components/NoConnection";
// import { allRouterLink } from "../router/AllRouterLinks";
// import { AuthContext } from "../context/AuthContext";
// import Footer from "../components/Footer";

// export const MainLayout = () => {
//   const { isOnline } = useContext(NetWorkContext);
//     const { isAuthenticated } = useContext(AuthContext);
  
//   const location = useLocation();
//   const hiddenPaths = [allRouterLink.registerUser, allRouterLink.loginUser, allRouterLink.changePassword, allRouterLink.forgotPassword, allRouterLink.resetPassword];
//   const shouldHide = hiddenPaths.includes(location.pathname);
  
//   if (!isOnline) {
//     return <Noconnection />; 
//   }

//   return (
//     <div>
//       {!shouldHide && <Navbar />}
//       {!shouldHide && isAuthenticated && <Sidebar />}
//       <Outlet />
//     </div>
//   );
// };


import React, { useContext } from "react";
import { Navbar } from "../components/Navbar";
import { Outlet, useLocation } from "react-router-dom";
import { NetWorkContext } from "../context/NetworkContext";
import { Sidebar } from "../components/Sidebar";
import Noconnection from "../components/NoConnection";
import { allRouterLink } from "../router/AllRouterLinks";
import { AuthContext } from "../context/AuthContext";
import Footer from "../components/Footer"; // ✅ default import

export const MainLayout = () => {
  const { isOnline } = useContext(NetWorkContext);
  const { isAuthenticated } = useContext(AuthContext);

  const location = useLocation();
  const hiddenPaths = [
    allRouterLink.registerUser,
    allRouterLink.loginUser,
    allRouterLink.changePassword,
    allRouterLink.forgotPassword,
    allRouterLink.resetPassword,
  ];
  const shouldHide = hiddenPaths.includes(location.pathname);

  if (!isOnline) {
    return <Noconnection />;
  }

  return (
    <div>
      {!shouldHide && <Navbar />}
      {!shouldHide && isAuthenticated && <Sidebar />}
      <Outlet />
      {!shouldHide && <Footer />}
    </div>
  );
};

