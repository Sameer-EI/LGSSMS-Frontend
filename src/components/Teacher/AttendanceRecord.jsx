import React, { useEffect, useState, useRef } from "react";
import Chart from "react-apexcharts";
import {
  fetchAttendanceData,
  fetchAttendanceDataStudent,
  fetchGuardianAttendanceData,
  fetchTeacherAttendanceData,
} from "../../services/api/Api";
// Change this import to use the correct function
import { fetchYearLevels } from "../../services/api/Api"; // Fixed import name

const AttendanceRecord = () => {
  // Loader & Error state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const chartRef = useRef(null);
  const userRole = localStorage.getItem("userRole");
  const studentId = localStorage.getItem("studentId");
  const guardianId = localStorage.getItem("guardianId");
  // Remove teacherClass from localStorage if not needed
  // const teacherClass = localStorage.getItem("teacherClass");

  // For teacher: class selection state
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  const [overallAttendance, setOverallAttendance] = useState({
    present: 0,
    total: 0,
    percentage: "0%",
  });
  
  const [chartData, setChartData] = useState({
    series: [{ name: "Attendance %", data: [] }],
    options: {
      chart: {
        type: "bar",
        height: 350,
        toolbar: {
          show: false,
        },
        events: {
          mounted: function (chartContext, config) {
            const svgElement = document.querySelector(".apexcharts-svg");
            if (svgElement) {
              svgElement.classList.add("exportable-chart");
            }
          },
        },
      },
      xaxis: { categories: [] },
      yaxis: {
        labels: { formatter: (val) => ` ${val}% ` },
      },
      tooltip: {
        y: { formatter: (val) => ` ${val}% ` },
      },
    },
  });

  // Load year levels for teacher class selection
  useEffect(() => {
    if (userRole === "teacher") {
      loadYearLevels();
    }
  }, [userRole]);

  const loadYearLevels = async () => {
    try {
      const data = await fetchYearLevels(); // Using the correct function
      if (data && Array.isArray(data)) {
        // Extract level names from the response
        const classes = data.map(item => item.level_name || item.name || item.year_level);
        setTeacherClasses(classes);
        
        // Set default to first class if available
        if (classes.length > 0) {
          setSelectedClass(classes[0]);
        }
      } else {
        console.warn("No year levels data found or invalid format:", data);
        setTeacherClasses([]);
      }
    } catch (err) {
      console.error("Failed to load year levels:", err);
      setTeacherClasses([]);
      setError("Failed to load class list. Please refresh the page.");
    }
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chartRef.current && !chartRef.current.contains(event.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getData = async () => {
    try {
      setLoading(true);
      setError("");
      let data;

      switch (userRole) {
        case "director":
        case "office staff":
          data = await fetchAttendanceData(selectedDate);
          if (data) {
            // For director/officeStaff: show class-wise attendance
            setOverallAttendance(
              data.overall_attendance || { present: 0, total: 0, percentage: "0%" }
            );
            
            const classWise = data.class_wise_attendance || [];
            const categories = classWise.map((item) => item.class_name);
            const percentageValues = classWise.map(
              (item) => parseFloat(item.percentage.replace("%", "")) || 0
            );

            setChartData((prev) => ({
              ...prev,
              series: [{ name: "Attendance %", data: percentageValues }],
              options: { ...prev.options, xaxis: { categories } },
            }));
          }
          break;

        case "teacher":
          if (!selectedClass) {
            if (teacherClasses.length === 0) {
              setError("No classes available. Please contact administrator.");
            } else {
              setError("Please select a class");
            }
            setLoading(false);
            return;
          }
          data = await fetchTeacherAttendanceData(selectedDate, selectedClass);
          if (data && Array.isArray(data)) {
            // For teacher: show student-wise attendance
            const categories = data.map((item) => item.student_name);
            const monthlyPercentages = data.map((item) => item.monthly_percentage || 0);
            const yearlyPercentages = data.map((item) => item.yearly_percentage || 0);

            // Calculate overall for teacher's class
            const totalStudents = data.length;
            const presentStudents = data.reduce((sum, item) => {
              return sum + (item.monthly_summary?.present || 0);
            }, 0);
            const totalDays = data.reduce((sum, item) => {
              return sum + (item.monthly_summary?.total_days || 0);
            }, 0);
            const avgPercentage = totalDays > 0 ? (presentStudents / totalDays * 100).toFixed(1) : 0;

            setOverallAttendance({
              present: presentStudents,
              total: totalDays,
              percentage: `${avgPercentage}%`,
            });

            // Show two series: Monthly and Yearly percentages
            setChartData((prev) => ({
              ...prev,
              series: [
                { name: "Monthly %", data: monthlyPercentages },
                { name: "Yearly %", data: yearlyPercentages }
              ],
              options: { 
                ...prev.options, 
                xaxis: { categories },
                yaxis: {
                  ...prev.options.yaxis,
                  max: 100 // Set max to 100% for percentages
                }
              },
            }));
          }
          break;

        case "student":
          data = await fetchAttendanceDataStudent(selectedDate, studentId);
          if (data) {
            // For student: show monthly vs yearly comparison
            setOverallAttendance({
              present: data.monthly_summary?.present || 0,
              total: data.monthly_summary?.total_days || 0,
              percentage: `${data.monthly_percentage || 0}%`,
            });

            // Student has only one data point, show as donut chart or single bar
            setChartData((prev) => ({
              ...prev,
              series: [
                { 
                  name: "Attendance", 
                  data: [data.monthly_percentage || 0, data.yearly_percentage || 0] 
                }
              ],
              options: { 
                ...prev.options, 
                xaxis: { categories: ["Monthly", "Yearly"] },
                chart: { ...prev.options.chart, type: "bar" },
                plotOptions: {
                  bar: {
                    horizontal: false,
                    columnWidth: '50%',
                  }
                }
              },
            }));
          }
          break;

        case "guardian":
          data = await fetchGuardianAttendanceData(selectedDate, guardianId);
          if (data) {
            // For guardian: show attendance for each child
            const children = data.children || [];
            const categories = children.map((child) => child.student_name);
            const monthlyPercentages = children.map((child) => 
              parseFloat(child.monthly_summary?.percentage?.replace("%", "") || 0)
            );
            const yearlyPercentages = children.map((child) =>
              parseFloat(child.yearly_summary?.percentage?.replace("%", "") || 0)
            );

            // Calculate overall for all children
            const totalPresent = children.reduce((sum, child) => 
              sum + (child.monthly_summary?.present || 0), 0
            );
            const totalDays = children.reduce((sum, child) => 
              sum + (child.monthly_summary?.total_days || 0), 0
            );
            const overallPercentage = totalDays > 0 ? (totalPresent / totalDays * 100).toFixed(1) : 0;

            setOverallAttendance({
              present: totalPresent,
              total: totalDays,
              percentage: `${overallPercentage}%`,
            });

            setChartData((prev) => ({
              ...prev,
              series: [
                { name: "Monthly %", data: monthlyPercentages },
                { name: "Yearly %", data: yearlyPercentages }
              ],
              options: { 
                ...prev.options, 
                xaxis: { categories },
                yaxis: {
                  ...prev.options.yaxis,
                  max: 100
                }
              },
            }));
          }
          break;

        default:
          setError("Invalid user role");
          break;
      }

      if (!data) {
        setOverallAttendance({ present: 0, total: 0, percentage: "0%" });
        setChartData((prev) => ({
          ...prev,
          series: [{ name: "Attendance %", data: [] }],
          options: { ...prev.options, xaxis: { categories: [] } },
        }));
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data. Try again");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === "teacher" && teacherClasses.length > 0 && !selectedClass) {
      // Set initial class when classes are loaded
      setSelectedClass(teacherClasses[0]);
    }
  }, [teacherClasses, userRole, selectedClass]);

  useEffect(() => {
    if (userRole !== "teacher" || selectedClass) {
      getData();
    }
  }, [selectedDate, selectedClass, userRole]);

  const handleReset = () => {
    setSelectedDate("");
    if (userRole === "teacher" && teacherClasses.length > 0) {
      setSelectedClass(teacherClasses[0]);
    }
  };

  // Fixed Export functions (same as before)
  const handleExportSVG = () => {
    setTimeout(() => {
      const svgElement = document.querySelector(".apexcharts-svg");
      if (svgElement) {
        const clonedSvg = svgElement.cloneNode(true);
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

        const svgData = new XMLSerializer().serializeToString(clonedSvg);
        const blob = new Blob([svgData], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `attendance-chart-${selectedDate || "all"}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }, 100);
    setExportOpen(false);
  };

  const handleExportPNG = () => {
    setTimeout(() => {
      const svgElement = document.querySelector(".apexcharts-svg");
      if (svgElement) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = new Image();

        const svgBlob = new Blob([svgData], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = `attendance-chart-${selectedDate || "all"}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
            URL.revokeObjectURL(url);
          }, "image/png");
        };

        img.src = url;
      }
    }, 100);
    setExportOpen(false);
  };

  const handleExportCSV = () => {
    const series = chartData.series;
    const categories = chartData.options.xaxis.categories;

    if (!series || series.length === 0 || !categories || categories.length === 0) {
      alert("No data available to export!");
      return;
    }

    let csvContent = "";
    
    // Write headers
    const seriesNames = series.map(s => s.name);
    csvContent = `Name,${seriesNames.join(",")}\r\n`;
    
    // Write data rows
    categories.forEach((category, index) => {
      const rowData = series.map(s => s.data[index] || 0);
      csvContent += `${category},${rowData.join(",")}\r\n`;
    });

    // Add overall attendance summary
    csvContent += `\r\nOverall Attendance Summary\r\n`;
    csvContent += `Present,${overallAttendance.present}\r\n`;
    csvContent += `Total,${overallAttendance.total}\r\n`;
    csvContent += `Percentage,${overallAttendance.percentage}\r\n`;
    csvContent += `Date,${selectedDate || "All"}\r\n`;
    if (userRole === "teacher") {
      csvContent += `Class,${selectedClass}\r\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-data-${selectedDate || "all"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  // Loader UI
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
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">{error}</p>
        <button 
          onClick={() => getData()} 
          className="mt-4 btn bgTheme text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 rounded-box my-5 shadow-lg">
        <span className="font-bold text-2xl flex pt-5 justify-center gap-1 text-gray-900 dark:text-gray-100">
          <i className="fa-solid fa-square-poll-vertical flex pt-1" />{" "}
          Attendance Record
          {userRole === "teacher" && selectedClass && ` - ${selectedClass}`}
        </span>

        <div className="flex flex-wrap justify-center gap-4 p-4">
          {/* Class selector for teacher */}
          {userRole === "teacher" && teacherClasses.length > 0 && (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="select select-bordered focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {teacherClasses.map((className, index) => (
                <option key={index} value={className}>
                  {className}
                </option>
              ))}
            </select>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input input-bordered focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleReset}
            className="btn bgTheme disabled:opacity-50 disabled:cursor-not-allowed text-white"
            disabled={!selectedDate && (userRole !== "teacher" || !selectedClass)}
          >
            Reset
          </button>
        </div>

        {/* Overall attendance stats */}
        <div className="flex flex-wrap justify-center gap-10 font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">
          <div>Total Present: {overallAttendance.present}</div>
          <div>Total Days: {overallAttendance.total}</div>
          <div>Overall Attendance: {overallAttendance.percentage}</div>
          {userRole === "guardian" && (
            <div>Children: {chartData.options.xaxis.categories?.length || 0}</div>
          )}
        </div>

        <div
          className="p-4 flex justify-center overflow-auto relative"
          ref={chartRef}
        >
          {/* Custom Export Dropdown */}
          <div className="absolute top-2 right-2 z-10">
            <div className="dropdown dropdown-end">
              <button
                className="btn btn-ghost btn-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => setExportOpen(!exportOpen)}
              >
                <i className="fa-solid fa-download mr-2"></i>
                Download
                <i className="fa-solid fa-chevron-down ml-2 text-xs"></i>
              </button>

              {exportOpen && (
                <ul className="dropdown-content menu p-2 shadow bg-base-100 dark:bg-gray-700 rounded-box w-52 border border-gray-200 dark:border-gray-600 mt-1">
                  <li>
                    <button
                      onClick={handleExportSVG}
                      className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
                    >
                      <i className="fa-solid fa-file-image text-blue-500 mr-2"></i>
                      Download as SVG
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleExportPNG}
                      className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
                    >
                      <i className="fa-solid fa-file-image text-green-500 mr-2"></i>
                      Download as PNG
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={handleExportCSV}
                      className="text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 p-2"
                    >
                      <i className="fa-solid fa-file-csv text-orange-500 mr-2"></i>
                      Download as CSV
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Chart */}
          {chartData.series[0].data.length > 0 ? (
            <Chart
              options={chartData.options}
              series={chartData.series}
              type={chartData.options.chart.type || "bar"}
              height={500}
              width={Math.max(1200, chartData.options.xaxis.categories.length * 80)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-96">
              <i className="fa-solid fa-chart-bar text-5xl text-gray-400 mb-4"></i>
              <p className="text-gray-500 dark:text-gray-400">No attendance data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceRecord;