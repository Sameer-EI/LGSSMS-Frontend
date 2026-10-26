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

  // Track dark mode (the page toggles a "dark" class on <html>)
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

  // ---------- Theme-aware chart styling ----------
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const gridColor = isDark ? "#374151" : "#e5e7eb";

  const tooltipBg = isDark ? "#111827" : "#ffffff";
  const tooltipText = isDark ? "#f9fafb" : "#111827";
  const tooltipBorder = isDark ? "#4b5563" : "#d1d5db";

  const escapeHtml = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  // Fully custom tooltip with inline colours, so no global CSS or inherited
  // colour can turn it into white-on-white again. Works for pie, bar and line.
  const customTooltip = ({ series, seriesIndex, dataPointIndex, w }) => {
    const isPie = !Array.isArray(series[seriesIndex]);
    const label = isPie
      ? w.globals.labels[seriesIndex]
      : w.globals.labels?.[dataPointIndex] ??
        w.globals.categoryLabels?.[dataPointIndex] ??
        "";
    const name = isPie ? "" : w.globals.seriesNames?.[seriesIndex] ?? "";
    const value = isPie
      ? series[seriesIndex]
      : series[seriesIndex][dataPointIndex];
    const dot = w.globals.colors?.[seriesIndex] || "#3b82f6";

    return `
      <div style="background:${tooltipBg};color:${tooltipText};border:1px solid ${tooltipBorder};border-radius:6px;padding:8px 12px;font-size:13px;line-height:1.5;box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <div style="font-weight:600;margin-bottom:4px;color:${tooltipText};">${escapeHtml(label)}</div>
        <div style="display:flex;align-items:center;gap:8px;color:${tooltipText};">
          <span style="width:10px;height:10px;border-radius:50%;background:${dot};display:inline-block;"></span>
          <span style="color:${tooltipText};">${name ? escapeHtml(name) + ": " : ""}<strong style="color:${tooltipText};">${escapeHtml(value)}</strong></span>
        </div>
      </div>`;
  };

  // Shared options applied to every chart.
  const baseChartOptions = {
    theme: { mode: isDark ? "dark" : "light" },
    chart: {
      toolbar: { show: false },
      background: "transparent",
      foreColor: textColor,
    },
    grid: { borderColor: gridColor },
    tooltip: {
      theme: isDark ? "dark" : "light",
      style: { fontSize: "13px" },
      custom: customTooltip,
    },
    legend: {
      position: "bottom",
      labels: { colors: textColor },
    },
  };

  const axisTitle = (text) => ({
    text,
    style: { fontSize: "14px", fontWeight: 600, color: textColor },
  });

  // Hide the floating "0" labels on empty bars
  const hideZeroLabels = {
    enabled: true,
    formatter: (val) => (val === 0 ? "" : val),
  };

  const chartKey = isDark ? "dark" : "light";

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

  const sortedClasses = classOrder.filter((c) =>
    Object.prototype.hasOwnProperty.call(classStrength, c)
  );
  const sortedData = sortedClasses.map((c) => classStrength[c]);

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

      {/* Forces readable chart text/tooltips even if global CSS overrides them */}
      <style>{`
        .apexcharts-tooltip {
          background: ${tooltipBg} !important;
          border: 1px solid ${tooltipBorder} !important;
          color: ${tooltipText} !important;
          box-shadow: none !important;
        }
        .apexcharts-tooltip * { color: ${tooltipText} !important; }
        .apexcharts-xaxis-texts-g text,
        .apexcharts-yaxis-texts-g text,
        .apexcharts-xaxis-title-text,
        .apexcharts-yaxis-title-text {
          fill: ${textColor} !important;
        }
        .apexcharts-legend-text { color: ${textColor} !important; }
        .apexcharts-gridline { stroke: ${gridColor} !important; }
      `}</style>

      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100">
        Director Dashboard
      </h3>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {Object.entries(dashboardData.summary || {}).map(([key, value]) => (
          <div
            key={key}
            onClick={() => {
              if (key === "new_admissions") {
                navigate("/newAdmissionList");
              }
            }}
            className={`border rounded-lg shadow-lg overflow-hidden borderTheme bg-white dark:bg-gray-800 dark:border-gray-700 transition-all ${
              key === "new_admissions"
                ? "cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:scale-105"
                : ""
            }`}
          >
            <div className="p-4 bgTheme text-white text-center">
              <h2 className="text-xl font-bold capitalize">
                {key.replace(/_/g, " ")}
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
                  key={`${role}-${chartKey}`}
                  height={height}
                  type="pie"
                  width="100%"
                  options={{
                    ...baseChartOptions,
                    labels: ["Male", "Female"],
                    colors: [constants.usColor, constants.canadaPink],
                    stroke: { colors: [isDark ? "#1f2937" : "#ffffff"] },
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
              key={`category-${chartKey}`}
              height={height}
              type="pie"
              width="100%"
              options={{
                ...baseChartOptions,
                labels: studentCategoryLabel,
                colors: [
                  constants.italianGreen,
                  constants.canadaPink,
                  constants.saffronOrange,
                  constants.usColor,
                ],
                stroke: { colors: [isDark ? "#1f2937" : "#ffffff"] },
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
              key={`income-${chartKey}`}
              type="bar"
              height={height}
              options={{
                ...baseChartOptions,
                xaxis: {
                  categories: incomeDistributionLabel,
                  title: axisTitle("Income Range"),
                  labels: { style: { colors: textColor } },
                },
                yaxis: {
                  title: axisTitle("Number of Students"),
                  labels: { style: { colors: textColor } },
                },
                colors: [constants.usColor],
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: "50%",
                  },
                },
                dataLabels: hideZeroLabels,
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
              key={`class-${chartKey}`}
              type="bar"
              height={height}
              options={{
                ...baseChartOptions,
                xaxis: {
                  categories: sortedClasses,
                  title: axisTitle("Class"),
                  labels: { style: { colors: textColor } },
                },
                yaxis: {
                  title: axisTitle("Number of Students"),
                  labels: { style: { colors: textColor } },
                },
                colors: [constants.usColor],
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: "50%",
                  },
                },
                dataLabels: hideZeroLabels,
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
              key={`year-${chartKey}`}
              type="line"
              height={height}
              options={{
                ...baseChartOptions,
                stroke: {
                  curve: "straight",
                  width: 5,
                },
                xaxis: {
                  categories: Object.keys(
                    dashboardData.students_per_year || {}
                  ),
                  title: axisTitle("Year"),
                  labels: { style: { colors: textColor } },
                },
                yaxis: {
                  title: axisTitle("Number of Admissions"),
                  labels: { style: { colors: textColor } },
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