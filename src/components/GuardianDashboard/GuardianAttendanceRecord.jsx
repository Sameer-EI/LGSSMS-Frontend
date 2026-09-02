import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { fetchGuardianAttendance } from "../../services/api/Api";

const GuardianAttendanceRecord = () => {
  const [guardianList, setGuardianList] = useState(null);
  const [guardianID, setGuardianID] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("guardian_id");
    setGuardianID(token);
  }, []);

  const getGuardianAttendance = async () => {
    if (!guardianID) return;

    setIsLoading(true);
    setError(false);
    try {
      const data = await fetchGuardianAttendance(
        guardianID,
        filterMonth,
        filterYear
      );
      setGuardianList(data);
    } catch (error) {
      console.error("Failed to get guardian attendance", error);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getGuardianAttendance();
  }, [guardianID, filterMonth, filterYear]);

  const colorPalette = [
    "#6e00ff", "#ffd24d", "#3b82f6", "#10b981",
    "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
    "#14b8a6", "#f97316",
  ];

  const colorPrimary = "#6e00ff";
  const colorSecondary = "#ffd24d";

  // Loader
  if (isLoading && !guardianList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading attendance data...</p>
      </div>
    );
  }

  // Error UI
  if (error || !guardianList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load attendance records. Please try again.
        </p>
        <button
          onClick={getGuardianAttendance}
          className="mt-4 btn bgTheme text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString("default", { month: "long" });
  };

  // Monthly data
  const monthlySeries = guardianList.children.map((child) => ({
    name: child.student_name,
    data: [
      child.monthly_summary.present,
      child.monthly_summary.absent,
      child.monthly_summary.leave,
    ],
  }));

  const monthlyOptions = {
    chart: { type: "bar", stacked: true, height: 350, toolbar: { show: true } },
    plotOptions: { bar: { horizontal: false, borderRadius: 10 } },
    xaxis: { categories: ["Present", "Absent", "Leave"] },
    colors: colorPalette,
    title: {
      text: `Monthly Attendance (${getMonthName(
        guardianList.filter_month
      )} ${guardianList.filter_year})`,
      align: "center",
      style: { fontSize: "16px", fontWeight: "bold", color: colorPalette[0] },
    },
  };

  // Yearly data
  const yearlySeries = guardianList.children.map((child) => ({
    name: child.student_name,
    data: [
      child.yearly_summary.present,
      child.yearly_summary.absent,
      child.yearly_summary.leave,
    ],
  }));

  const yearlyOptions = {
    ...monthlyOptions,
    title: {
      text: `Yearly Attendance (${guardianList.filter_year})`,
      align: "center",
      style: { fontSize: "16px", fontWeight: "bold", color: colorPalette[0] },
    },
  };

  // Percentage data
  const percentageSeries = guardianList.children.map((child) => ({
    name: child.student_name,
    data: [
      parseFloat(child.monthly_summary.percentage),
      parseFloat(child.yearly_summary.percentage),
    ],
  }));

  const percentageOptions = {
    chart: { type: "radialBar", height: 350 },
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "18px" },
          value: { fontSize: "14px" },
          total: {
            show: true,
            label: "Average",
            formatter: (w) => {
              const sum = w.globals.series.reduce((a, b) => a + b, 0);
              return (sum / w.globals.series.length).toFixed(1) + "%";
            },
          },
        },
      },
    },
    colors: [colorPrimary, colorSecondary],
    labels: ["Monthly", "Yearly"],
  };

  // Month & year options
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({
    value: currentYear - 5 + i,
    label: currentYear - 5 + i,
  }));

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === "month") setFilterMonth(parseInt(value));
    else if (name === "year") setFilterYear(parseInt(value));
  };

  return (
    <div className="p-4 mb-24 md:mb-10"><br></br>
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-2">
        <i className="fa-solid fa-square-poll-vertical" /> Attendance Record
      </h1>
      <div className="flex flex-wrap justify-start gap-6 my-8">
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Select Month
          </label>
          <select
            id="month"
            name="month"
            value={filterMonth}
            onChange={handleFilterChange}
            className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="year" className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Select Year
          </label>
          <select
            id="year"
            name="year"
            value={filterYear}
            onChange={handleFilterChange}
            className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
            disabled={isLoading}
          >
            {yearOptions.map((year) => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={getGuardianAttendance}
            disabled={isLoading}
            className={`btn bgTheme text-white w-30 ${isLoading ? "bg-gray-400 cursor-not-allowed" : "bgTheme hover:opacity-90"
              }`}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt"></i> Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <ReactApexChart
            options={monthlyOptions}
            series={monthlySeries}
            type="bar"
            height={350}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <ReactApexChart
            options={yearlyOptions}
            series={yearlySeries}
            type="bar"
            height={350}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guardianList.children.map((child, index) => (
              <div key={index} className="p-4">
                <h3 className="text-lg font-semibold text-center mb-4 textTheme">
                  {child.student_name} - {child.class_name}
                </h3>
                <ReactApexChart
                  options={percentageOptions}
                  series={[
                    percentageSeries[index].data[0],
                    percentageSeries[index].data[1],
                  ]}
                  type="radialBar"
                  height={300}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuardianAttendanceRecord;