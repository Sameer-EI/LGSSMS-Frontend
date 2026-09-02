import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import {
  fetchDirectorDashboard,
  fetchIncomeDistributionDashboard,
  fetchStudentCategoryDashboard,
} from "../../services/api/Api";
import LoginSuccessHandler from "../Modals/LoginSucces";
import { constants } from "../../global/constants";
import { Loader } from "../../global/Loader";
import { useNavigate } from "react-router-dom";

export const DirectorDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [studentCategoryDashboardData, setStudentCategoryDashboardData] =
    useState(null);
  const [incomeDistributionData, setIncomeDistributionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const height = 400;
  const navigate = useNavigate();

  const loadAllDashboardData = async () => {
    try {
      const [directorRes, studentCatRes, incomeDistRes] = await Promise.all([
        fetchDirectorDashboard(),
        fetchStudentCategoryDashboard(),
        fetchIncomeDistributionDashboard(),
      ]);

      setDashboardData(directorRes);
      setStudentCategoryDashboardData(studentCatRes);
      setIncomeDistributionData(incomeDistRes);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();
  }, []);

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const classOrder = [
    "Pre Nursery",
    "Nursery",
    "KG 1",
    "KG 2",
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
    "Class 11",
    "Class 12",
  ];

  const classStrength = dashboardData?.class_strength || {};

  const sortedClasses = classOrder.filter(c => classStrength.hasOwnProperty(c));
  const sortedData = sortedClasses.map(c => classStrength[c]);



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

  if (
    !dashboardData ||
    !studentCategoryDashboardData ||
    !incomeDistributionData
  ) {
    return <div className="p-4 text-center">Failed to load dashboard data</div>;
  }

  const studentCategoryLabel = studentCategoryDashboardData.map(
    (item) => item.category_name
  );
  const studentCategorySeries = studentCategoryDashboardData.map(
    (item) => item.count
  );

  const incomeDistributionLabel = incomeDistributionData.map(
    (item) => item.income_range
  );
  const incomeDistributionSeries = incomeDistributionData.map(
    (item) => item.count
  );

  return (
    <div className="p-4 space-y-6 mb-24 md:mb-10">
      <LoginSuccessHandler />
      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        Director Dashboard
      </h3>
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Object.entries(dashboardData.summary || {}).map(([key, value]) => (
          // <div
          //   key={key}
          //   className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700"
          // >
          <div
            key={key}
            onClick={() => {
              if (key === "new_admissions") {
                navigate("/newAdmissionList");
              }
            }}
            className={`border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700 transition-all ${key === "new_admissions"
                ? "cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:scale-105"
                : ""
              }`}
          >
            <div className="p-4 bgTheme text-white text-center">
              <h2 className="text-xl font-bold capitalize">
                {key.replace("_", " ")}
              </h2>
            </div>
            <div className="p-4 text-center text-2xl font-semibold text-gray-800 dark:text-gray-100">
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* GENDER DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["students", "teachers"].map((role) => {
          const data = dashboardData.gender_distribution?.[role];
          if (!data) return null;

          return (
            <div
              key={role}
              className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="p-4 bgTheme text-white text-center">
                <h2 className="text-xl font-bold capitalize">
                  Gender Distribution - {role}
                </h2>
              </div>
              <div className="p-4">
                <Chart
                  height={height}
                  type="pie"
                  width="100%"
                  options={{
                    labels: ["Male", "Female"],
                    colors: [constants.usColor, constants.canadaPink],
                    legend: {
                      position: "bottom",
                      labels: {
                        colors: [
                          () =>
                            document.documentElement.classList.contains("dark")
                              ? "#ffffff"
                              : "#000000",
                          () =>
                            document.documentElement.classList.contains("dark")
                              ? "#ffffff"
                              : "#000000",
                        ],
                      },
                    },
                  }}
                  series={[data.count.male, data.count.female]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* CATEGORY AND INCOME DISTRIBUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Category */}
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Student Category</h2>
          </div>
          <div className="p-4">
            <Chart
              height={height}
              type="pie"
              width="100%"
              options={{
                labels: studentCategoryLabel,
                colors: [
                  constants.italianGreen,
                  constants.canadaPink,
                  constants.saffronOrange,
                  constants.usColor,
                ],
                legend: {
                  position: "bottom",
                  labels: {
                    colors: [
                      () =>
                        document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#000000",
                      () =>
                        document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#000000",
                      () =>
                        document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#000000",
                      () =>
                        document.documentElement.classList.contains("dark")
                          ? "#ffffff"
                          : "#000000",
                    ],
                  },
                },
              }}
              series={studentCategorySeries}
            />
          </div>
        </div>

        {/* Income Distribution */}
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Income Category</h2>
          </div>
          <div className="p-4">
            <Chart
              type="bar"
              height={height}
              options={{
                chart: { toolbar: { show: false }, background: "transparent" },
                xaxis: {
                  categories: incomeDistributionLabel,
                  title: {
                    text: "Income Range",
                    style: {
                      fontSize: "14px",
                      fontWeight: 600,
                      color: constants.textTheme,
                    },
                  },
                },
                yaxis: {
                  title: {
                    text: "Number of Students",
                    style: {
                      fontSize: "14px",
                      fontWeight: 600,
                      color: constants.textTheme,
                    },
                  },
                },
                colors: [constants.usColor],
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: "50%",
                  },
                },
                legend: { show: false },
              }}
              series={[{ name: "Students", data: incomeDistributionSeries }]}
            />
          </div>
        </div>
      </div>

      {/* CLASS STRENGTH & STUDENTS PER YEAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Class Strength */}
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Class Strength</h2>
          </div>
          <div className="p-4">
            <Chart
              type="bar"
              height={height}
              options={{
                chart: { toolbar: { show: false }, background: "transparent" },
                xaxis: {
                  categories: sortedClasses,
                  title: {
                    text: "Class",
                    style: {
                      fontSize: "14px",
                      fontWeight: 600,
                      color: constants.textTheme,
                    },
                  },
                },
                yaxis: {
                  title: {
                    text: "Number of Student",
                    style: {
                      fontSize: "14px",
                      fontWeight: 600,
                      color: constants.textTheme,
                    },
                  },
                },
                colors: [constants.usColor],
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: "50%",
                  },
                },
              }}
              series={[
                {
                  name: "Students",
                  data: sortedData,
                },
              ]}
            />
          </div>
        </div>

        {/* Students Per Year */}
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Student Admission Per Year</h2>
          </div>
          <div className="p-4">
            <Chart
              type="line"
              height={height}
              options={{
                chart: { toolbar: { show: false }, background: "transparent" },
                stroke: {
                  curve: "straight",
                  width: 5,
                },
                xaxis: {
                  categories: Object.keys(
                    dashboardData.students_per_year || {}
                  ),
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
                colors: [constants.usColor],
              }}
              series={[
                {
                  name: "Students",
                  data: Object.values(dashboardData.students_per_year || {}),
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
