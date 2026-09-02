import Chart from "react-apexcharts";
import React, { useCallback, useEffect, useState } from "react";
import { fetchFeeDashboard, fetchFeeDashboardByMonth } from "../../services/api/Api";
import { constants } from "../../global/constants";

const FeeDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const height = 400;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (selectedMonth === "") {
        response = await fetchFeeDashboard();
      } else {
        response = await fetchFeeDashboardByMonth(selectedMonth);
      }
      setDashboardData(response);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("Failed to load data");
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadDashboardData();

  }, [loadDashboardData]);

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };

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

  if (error || !dashboardData) {
    return <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
      <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
    </div>;
  }

  // Get the appropriate summary based on month selection
  const getSummaryData = () => {
    if (selectedMonth === "") {
      return dashboardData.overall_summary;
    }
    return dashboardData.monthly_summary.find(month => month.month === selectedMonth) || {};
  };

  const currentSummary = getSummaryData();
  const paymentModes = dashboardData.payment_mode_distribution || [];

  const renderDonutChart = (labels, series, colors) => (
    <Chart
      height={height}
      type="donut"
      width="100%"
      options={{
        labels,
        colors,
        legend: {
          position: "bottom",
          fontSize: "14px",
          fontWeight: 600,
          markers: {
            width: 12,
            height: 12,
            radius: 6,
          },
          labels: {
            colors: [
              () => document.documentElement.classList.contains("dark") ? "#ffffff" : "#000000",
              () => document.documentElement.classList.contains("dark") ? "#ffffff" : "#000000"
            ],
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (val) => `${Math.round(val)}%`,
          style: {
            fontSize: "12px",
            fontWeight: "bold",
            colors: ["#fff"]
          },
        },
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                name: {
                  show: true,
                  fontSize: "14px",
                  color: `${constants.textColor}`,
                },
                value: {
                  show: true,
                  fontSize: "22px",
                  fontWeight: "bold",
                  color: "gray",
                  formatter: (val) => `${val.toLocaleString()}`,
                },
                total: {
                  show: true,
                  label: "Total",
                  color: "#6B7280",
                  formatter: (w) => {
                    const sum = w.globals.seriesTotals.reduce((a, b) => a + b, 0);
                    return `${sum.toLocaleString()}`;
                  },
                },
              },
            },
          },
        },
        tooltip: {
          enabled: true,
          y: {
            formatter: (val) => `${val.toLocaleString()}`,
          },
        },
      }}
      series={series}
    />
  );

  return (
    <div className="p-4 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <h3 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
        Fee Dashboard
      </h3>

      {/* Month Filter */}
      <div className="flex mb-4">
        <select
          value={selectedMonth}
          onChange={handleMonthChange}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-4 py-2 focus:outline-none"
        >
          <option value="">All Months</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* OVERALL AND MONTHLY SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">
              {selectedMonth ? `${selectedMonth} Summary` : "Overall Summary"}
            </h2>
          </div>
          <div className="p-4">
            {renderDonutChart(
              ["Paid Amount", "Due Amount"],
              [currentSummary.paid_amount || 0, currentSummary.due_amount || 0],
              [constants.usColor, constants.canadaPink]
            )}
          </div>
        </div>

        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Payment Mode Distribution</h2>
          </div>
          <div className="p-4">
            {renderDonutChart(
              paymentModes.map((mode) => mode.payment_mode),
              paymentModes.map((mode) => mode.count),
              [constants.usColor, constants.canadaPink, constants.saffronOrange]
            )}
          </div>
        </div>
      </div>

      {/* ADDITIONAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Detailed Summary</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Total Amount</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                ₹{currentSummary.total_amount?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Late Fees</h3>
              <p className="text-2xl font-bold text-orange-600">
                ₹{currentSummary.late_fee?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Paid Percentage</h3>
              <p className="text-2xl font-bold text-green-600">
                {currentSummary.paid_percent?.toFixed(2) || 0}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-600 dark:text-white">Due Percentage</h3>
              <p className="text-2xl font-bold text-red-600">
                {currentSummary.due_percent?.toFixed(2) || 0}%
              </p>
            </div>
          </div>
        </div>

        <div className="border rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl borderTheme bg-white dark:bg-gray-800">
          <div className="p-4 bgTheme text-white text-center">
            <h2 className="text-xl font-bold">Overdue Accounts</h2>
          </div>
          <div className="p-4">
            {dashboardData.defaulter_summary?.count > 0 ? (
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-red-600">
                  {dashboardData.defaulter_summary.count} Accounts are overdue
                </p>
                <p className="text-2xl text-gray-600 dark:text-white">
                  ({dashboardData.defaulter_summary.percent}% of total)
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-white">No Overdue Accounts found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeeDashboard;