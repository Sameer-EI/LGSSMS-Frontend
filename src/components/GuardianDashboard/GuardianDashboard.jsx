import React, { useContext, useEffect, useState } from "react";
import { fetchGuardianDashboard } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";
import LoginSuccessHandler from "../Modals/LoginSucces";

export const GuardianDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
  // const {guardianID} = useContext(AuthContext);
  const {userID} = useContext(AuthContext);
  

  const getGuardianDashboardData = async () => {
    try {
      const data = await fetchGuardianDashboard(userID);
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.log("failed to fetch guardian dashboard data", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    getGuardianDashboardData();
  }, []);
if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="p-4 text-center">Failed to load dashboard data</div>;
  }
  return (
    <div className="p-4 space-y-6 mb-24 md:mb-10">
      <LoginSuccessHandler/>
      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        {dashboardData.guardian}'s Dashboard
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardData.children && dashboardData.children.length > 0 ? (
          dashboardData.children.map((child, idx) => (
            <div
              key={idx}
              className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white"
            >
              {/* Header */}
              <div className="p-4 bgTheme text-white">
                <h2 className="text-xl font-bold truncate">
                  {child.student_name}
                </h2>
              </div>

              {/* Child Info */}
              <div className="p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Class:</span>
                  <span className="text-gray-800 font-semibold">
                    {child.class}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center col-span-full text-gray-500">
            No children data available.
          </div>
        )}
      </div>
    </div>
  );
};
