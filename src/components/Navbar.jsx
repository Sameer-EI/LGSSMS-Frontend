import { useRef, useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { constants } from "../global/constants";
import { allRouterLink } from "../router/AllRouterLinks";
import LogoutModal from "../components/Modals/LogoutModal";
import logo from "../assets/logo.png";

export const Navbar = () => {
  const {
    LogoutUser,
    userRole,
    isAuthenticated,
    userName,
    userProfile,
    axiosInstance,
  } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profileImageError, setProfileImageError] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const logoutDialogRef = useRef(null);
  const [profileData, setProfileData] = useState({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const BASE_URL = constants.baseUrl;

  const defaultProfileImage =
    "https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp";

  const handleImageError = () => {
    setProfileImageError(true);
  };

const handleLogout = async () => {
  try {
    setIsLoggingOut(true);
    await LogoutUser();
    setProfileData({});
    setProfileImageError(false);
    navigate("/login", { replace: true });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  }
};


  const handleModalClose = () => {
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (showLogoutModal && logoutDialogRef.current) {
      logoutDialogRef.current.showModal();
    }
  }, [showLogoutModal]);

  const getProfileRoute = (role) => {
    switch (role) {
      case constants.roles.officeStaff:
        return allRouterLink.officeStaffProfile;
      case constants.roles.teacher:
        return allRouterLink.teacherProfile;
      case constants.roles.director:
        return allRouterLink.directorProfile;
      case constants.roles.student:
        return allRouterLink.studentProfile;
      case constants.roles.guardian:
        return allRouterLink.guardianProfile;
      default:
        return allRouterLink.notFound;
    }
  };

  const closeDropdown = () => {
    document.activeElement.blur();
  };

  useEffect(() => {
    if (!isAuthenticated || !userRole) return;

    const fetchProfileData = async () => {
      try {
        let response;

        switch (userRole) {
          case constants.roles.director:
            response = await axiosInstance.get(
              `/d/director/director_my_profile/`
            );
            break;
          case constants.roles.officeStaff:
            response = await axiosInstance.get(
              `/d/officestaff/OfficeStaff_my_profile/`
            );
            break;
          case constants.roles.teacher:
            response = await axiosInstance.get(
              `/t/teacher/teacher_my_profile/`
            );
            break;
          case constants.roles.student:
            response = await axiosInstance.get(
              `/s/students/student_my_profile/`
            );
            break;
          case constants.roles.guardian:
            response = await axiosInstance.get(
              `/s/guardian/guardian_my_profile/`
            );
            break;
          default:
            throw new Error("Unsupported user role");
        }

        const data = response.data;
        setProfileData(data);
      } catch (err) {
        console.error("Error fetching profile data:", err);
      }
    };

    fetchProfileData();
  }, [axiosInstance, userRole, isAuthenticated]);

  let profilePicUrl = defaultProfileImage;

  if (isAuthenticated) {
    if (profileData?.user_profile) {
      profilePicUrl = `${BASE_URL}${profileData.user_profile}`;
    } else if (userProfile) {
      profilePicUrl = `${BASE_URL}${userProfile}`;
    }
  }

  return (
    <>
      <div className="navbar bg-base-100 shadow-sm sticky top-0 z-40 flex flex-wrap md:flex-nowrap py-0">
        <div className="flex-1 flex items-center">
          {isAuthenticated && (
            <label
              htmlFor="my-drawer"
              className="btn btn-ghost btn-circle hover:bg-base-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block h-5 w-5 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </label>
          )}
          {/* <span className="nexus-logo text-xl md:text-2xl ml-2">New Progressive</span> */}
          <img src={logo} alt="Logo" className="mainLogo" />
        </div>

        <div className="flex-none flex items-center">
          {isAuthenticated ? (
            <>
              <div className="dropdown dropdown-end">
                <div
                  tabIndex={0}
                  role="button"
                  className="btn btn-ghost avatar flex items-center"
                >
                  <div className="w-8 md:w-10 rounded-full">
                    <img
                      alt="User profile"
                      src={profilePicUrl}
                      onError={handleImageError}
                    />
                  </div>
                  <span className="hidden md:block ml-2">{userName}</span>
                </div>
                <ul
                  tabIndex={0}
                  className="menu menu-sm dropdown-content bg-base-100 rounded-box z-50 mt-3 w-52 p-2 shadow"
                >
                  <li onClick={closeDropdown}>
                    <Link to={getProfileRoute(userRole)}>
                      <i className="fa-solid fa-user"></i> Profile
                    </Link>
                  </li>
                  <li onClick={closeDropdown}>
                    <Link to={allRouterLink.changePassword}>
                      <i className="fa-solid fa-lock"></i> Change Password
                    </Link>
                  </li>

                  <li
                    onClick={() => {
                      closeDropdown();
                      setShowLogoutModal(true);
                    }}
                  >
                    <a className="cursor-pointer">
                      <i className="fa-solid fa-arrow-right-from-bracket"></i>{" "}
                      Logout
                    </a>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="btn btn-primary btn-sm md:btn-md text-white normal-case"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Logout Modal */}
<LogoutModal
  show={showLogoutModal}
  onConfirm={handleLogout}
  onClose={handleModalClose}
  isLoading={isLoggingOut}
/>
    </>
  );
};
