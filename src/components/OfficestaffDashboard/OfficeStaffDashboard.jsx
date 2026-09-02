import Chart from "react-apexcharts";
import React, { useEffect, useState } from "react";
import { fetchOfficeStaffDashboard } from "../../services/api/Api";
import { constants } from "../../global/constants";
import LoginSuccessHandler from "../Modals/LoginSucces";

export const OfficeStaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const getOfficeStaffDashboardData = async () => {
    try {
      const data = await fetchOfficeStaffDashboard();
      setDashboardData(data);
      setLoading(false);
    } catch (err) {
      console.log("Failed to fetch office staff dashboard data", err);
      setLoading(false);
      setError(true);
    }
  };

  useEffect(() => {
    getOfficeStaffDashboardData();
  }, []);

  // New loader
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

  // Error UI
  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  const admissionYears = Object.keys(dashboardData.admissions_per_year);
  const admissionCounts = Object.values(dashboardData.admissions_per_year);

  const options = {
    chart: {
      id: "admissions-line",
    },
    toolbar: { show: false },
    xaxis: {
      categories: admissionYears,
      title: {
        text: "Year",
        style: {
          fontSize: "14px",
          fontWeight: 600,
          color: constants.textTheme,
        },
      },
    },
    yaxis: {
      title: {
        text: "Number of Admissions",
        style: {
          fontSize: "14px",
          fontWeight: 600,
          color: constants.textTheme,
        },
      },
    },
    stroke: {
      curve: "straight",
      width: 5,
    },
    colors: [constants.canadaPink],
  };

  const series = [
    {
      name: "Admissions",
      data: admissionCounts,
    },
  ];

  return (
    <div className="p-4 space-y-9 mb-24 md:mb-10">
      <LoginSuccessHandler />
      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        Office Staff Dashboard
      </h3>

      <div className="grid grid-cols-12 gap-4">
        {/* Left Column */}
        <div className="col-span-12 md:col-span-3 flex flex-col gap-4 h-full">
          <div className="flex-1 border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bgTheme text-white rounded-t-lg">
              <h2 className="text-lg font-bold">Academic Year</h2>
            </div>
            <div className="p-6 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-wide">
                  {dashboardData.current_academic_year}
                </p>
                <p className="text-sm text-gray-500 mt-1">Session</p>
              </div>
            </div>
          </div>

          <div className="flex-1 border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bgTheme text-white rounded-t-lg">
              <h2 className="text-lg font-bold">New Admissions This Year</h2>
            </div>
            <div className="p-6 flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-wide">
                  {dashboardData.new_admissions_this_year}
                </p>
                <p className="text-sm text-gray-500 mt-1">Total Count</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="col-span-12 md:col-span-9">
          <div className="h-full border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bgTheme text-white rounded-t-lg">
              <h2 className="text-lg font-bold">Student Admission Per Year</h2>
            </div>
            <div className="p-4 flex-1">
              <Chart
                options={options}
                series={series}
                type="line"
                height={350}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
