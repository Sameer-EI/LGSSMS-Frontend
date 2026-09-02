import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { fetchSchoolYear, fetchYearLevels } from "../../services/api/Api";
import { allRouterLink } from "../../router/AllRouterLinks";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FeeSummaryTable = () => {
  const { axiosInstance } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedFeeType, setSelectedFeeType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Input value
  const [appliedSearch, setAppliedSearch] = useState(""); // Actual search value

  // Data states
  const [allStudents, setAllStudents] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // Download loading state
  const [downloading, setDownloading] = useState(false);

  // Table ref for PDF export
  const tableRef = useRef(null);
  const searchInputRef = useRef(null);

  // Fetch school years and year levels
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [years, levels] = await Promise.all([
          fetchSchoolYear(),
          fetchYearLevels()
        ]);
        setSchoolYears(years || []);
        setYearLevels(levels || []);
      } catch (err) {
        console.error("Error fetching initial data:", err);
      }
    };
    fetchInitialData();
  }, []);

  // Extract unique months from payments
  const getMonthsFromPayments = useCallback((payments) => {
    if (!payments || !Array.isArray(payments)) return [];
    const months = payments
      .filter(p => p.month)
      .map(p => p.month)
      .filter(month => month !== null && month !== undefined);
    return [...new Set(months)];
  }, []);
  // Get all fee types from payments
  const getFeeTypesFromPayments = useCallback((payments) => {
    if (!payments || !Array.isArray(payments)) return [];
    const feeTypes = payments
      .filter(p => p.fee_type)
      .map(p => p.fee_type)
      .filter(type => type !== null && type !== undefined);
    return [...new Set(feeTypes)];
  }, []);

  // ✅ Build query parameters - uses appliedSearch instead of searchTerm
  const buildSearchParams = useCallback((page = 1, forDownload = false) => {
    const params = new URLSearchParams();

    if (selectedSchoolYear) {
      const yearItem = schoolYears.find(
        (year) => year.year_name === selectedSchoolYear
      );
      if (yearItem) {
        params.append("school_year_id", yearItem.id);
      }
    }

    if (selectedClass) {
      const classItem = yearLevels.find(
        (level) => level.level_name === selectedClass
      );
      if (classItem) {
        params.append("class_id", classItem.id);
      }
    }

    if (selectedMonth) {
      params.append("month", selectedMonth);
    }

    if (selectedFeeType) {
      params.append("fee_type", selectedFeeType);
    }

    if (fromDate) {
      params.append("start_date", fromDate);
    }
    if (toDate) {
      params.append("end_date", toDate);
    }

    // ✅ Use appliedSearch instead of searchTerm
    if (appliedSearch.trim()) {
      const searchValue = appliedSearch.trim();
      if (searchValue.startsWith('REC-')) {
        params.append("receipt_number", searchValue);
      } else if (!isNaN(searchValue) && searchValue.length > 0) {
        params.append("scholar_number", searchValue);
      } else {
        params.append("student", searchValue);
      }
    }

    if (forDownload) {
      params.append("limit", 10000);
      params.append("offset", 0);
    } else {
      const offset = (page - 1) * pageSize;
      params.append("limit", pageSize);
      params.append("offset", offset);
    }

    return params.toString();
  }, [selectedMonth, selectedClass, selectedSchoolYear, selectedFeeType, fromDate, toDate, appliedSearch, pageSize, yearLevels, schoolYears]);

  // Fetch all data for download (follow pagination via `next` links)
  const fetchAllDataForDownload = useCallback(async () => {
    setDownloading(true);
    try {
      const results = [];
      // start with a request that uses large limit/offset params
      let url = `/d/studentfees/search_receipts/?${buildSearchParams(1, true)}`;

      while (url) {
        const response = await axiosInstance.get(url);
        if (response.status === 200 || response.status === 201) {
          const data = response.data;
          if (data && typeof data === 'object' && 'results' in data) {
            if (Array.isArray(data.results)) {
              results.push(...data.results);
            }
            url = data.next || null;
          } else if (Array.isArray(data)) {
            results.push(...data);
            url = null;
          } else {
            url = null;
          }
        } else {
          url = null;
        }
      }

      return results;
    } catch (err) {
      console.error("Error fetching data for download:", err);
      throw err;
    } finally {
      setDownloading(false);
    }
  }, [buildSearchParams, axiosInstance]);

  // ✅ Fetch data with proper error handling
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = buildSearchParams(page);
      const response = await axiosInstance.get(
        `/d/studentfees/search_receipts/?${queryParams}`
      );

      const data = response.data;

      if (response.status === 200 || response.status === 201) {
        if (data && typeof data === 'object' && 'results' in data) {
          if (Array.isArray(data.results)) {
            setAllStudents(data.results);
            setTotalCount(data.count || data.results.length || 0);
            setNextUrl(data.next || null);
            setPrevUrl(data.previous || null);
            setError(null);
          } else {
            setAllStudents([]);
            setTotalCount(0);
            setNextUrl(null);
            setPrevUrl(null);
            setError(null);
          }
        } else if (Array.isArray(data)) {
          setAllStudents(data);
          setTotalCount(data.length);
          setNextUrl(null);
          setPrevUrl(null);
          setError(null);
        } else if (data && typeof data === 'object' && 'detail' in data) {
          setAllStudents([]);
          setTotalCount(0);
          setNextUrl(null);
          setPrevUrl(null);
          setError(null);
        } else {
          setAllStudents([]);
          setTotalCount(0);
          setNextUrl(null);
          setPrevUrl(null);
          setError(null);
        }
      } else {
        setError(`Failed to fetch data. Status: ${response.status}`);
      }
    } catch (err) {
      console.error("❌ Fetch error:", err);

      if (err.response) {
        const status = err.response.status;
        if (status === 404 || status === 400) {
          setAllStudents([]);
          setTotalCount(0);
          setNextUrl(null);
          setPrevUrl(null);
          setError(null);
        } else if (status === 401) {
          setError("Authentication failed. Please login again.");
        } else if (status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setAllStudents([]);
          setTotalCount(0);
          setNextUrl(null);
          setPrevUrl(null);
          setError(null);
        }
      } else if (err.request) {
        setError("Network error. Please check your connection.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [buildSearchParams, axiosInstance]);

  // Initial load
  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Handle filter changes
  const handleFilterChange = useCallback((setter, value) => {
    setter(value);
    setCurrentPage(1);
    setError(null);
  }, []);

  // Handle date range with validation
  const handleDateChange = useCallback((setter, value) => {
    if (setter === setFromDate && toDate && value > toDate) {
      alert("⚠️ From date cannot be greater than To date");
      return;
    }
    if (setter === setToDate && fromDate && value < fromDate) {
      alert("⚠️ To date cannot be less than From date");
      return;
    }
    handleFilterChange(setter, value);
  }, [fromDate, toDate, handleFilterChange]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSelectedMonth("");
    setSelectedClass("");
    setSelectedSchoolYear("");
    setSelectedFeeType("");
    setSearchTerm("");
    setAppliedSearch("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
    setError(null);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      searchInputRef.current.focus();
    }
  }, []);

  // ✅ Search on button click or Enter key
  const handleSearch = useCallback(() => {
    setAppliedSearch(searchTerm);
    setCurrentPage(1);
    setError(null);
  }, [searchTerm]);

  // ✅ Only updates input value, doesn't trigger search
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
  }, []);

  // ✅ Enter key triggers search
  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // ✅ FIXED: Auto-fetch when filters change - added appliedSearch to dependencies
  useEffect(() => {
    if (currentPage === 1) {
      fetchData(1);
    }
  }, [selectedMonth, selectedClass, selectedSchoolYear, selectedFeeType, fromDate, toDate, appliedSearch, fetchData, currentPage]);

  // Pagination handlers
  const goToPreviousPage = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      fetchData(newPage);
    }
  }, [currentPage, fetchData]);

  const goToNextPage = useCallback(() => {
    if (nextUrl) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      fetchData(newPage);
    }
  }, [nextUrl, fetchData]);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  // 📥 DOWNLOAD FUNCTIONS

  // Prepare data for export with total row
  const prepareExportData = useCallback((data) => {
    const exportData = data.map((record, index) => {
      const monthsPaid = getMonthsFromPayments(record.payments);
      const feeTypes = getFeeTypesFromPayments(record.payments);

      return {
        "S.No": index + 1,
        "Receipt No": record.receipt_number || "—",
        "Student Name": record.student?.name || "—",
        "Class": record.student?.class_name || "—",
        "Section": record.student?.class_section || "—",
        "School Year": record.school_year || "—",
        "Fee Types": feeTypes.join(", ") || "—",
        "Months Paid": monthsPaid.join(", ") || "—",
        "Payment Date": record.payment_date || "—",
        "Paid Amount": `${record.total_amount_paid || 0}`,
      };
    });

    const totalPaidAmount = data.reduce((sum, record) => {
      return sum + (parseFloat(record.total_amount_paid) || 0);
    }, 0);

    if (exportData.length > 0) {
      exportData.push({
        "S.No": "",
        "Receipt No": "",
        "Student Name": "",
        "Class": "",
        "Section": "",
        "School Year": "",
        "Fee Types": "",
        "Months Paid": "",
        "Payment Date": "TOTAL",
        "Paid Amount": totalPaidAmount.toFixed(2),
      });
    }

    return exportData;
  }, [getMonthsFromPayments, getFeeTypesFromPayments]);

  // 📥 Download as Excel
  const downloadExcel = useCallback(async () => {
    if (allStudents.length === 0) {
      alert("No data available to download!");
      return;
    }

    setDownloading(true);
    try {
      let dataToExport = allStudents;

      if (totalCount > allStudents.length) {
        const allData = await fetchAllDataForDownload();
        if (allData.length > 0) {
          dataToExport = allData;
        }
      }

      const exportData = prepareExportData(dataToExport);

      const ws = XLSX.utils.json_to_sheet(exportData);

      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fee Records");

      let filename = "fee_records";
      if (selectedSchoolYear) filename += `_${selectedSchoolYear}`;
      if (selectedClass) filename += `_${selectedClass}`;
      if (selectedMonth) filename += `_${selectedMonth}`;
      filename += `_${new Date().toISOString().split('T')[0]}`;

      XLSX.writeFile(wb, `${filename}.xlsx`);

    } catch (error) {
      console.error("Error downloading Excel:", error);
      alert("Failed to download Excel file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [allStudents, totalCount, fetchAllDataForDownload, prepareExportData, selectedSchoolYear, selectedClass, selectedMonth]);

  // 📥 Download as PDF
  const downloadPDF = useCallback(async () => {
    if (allStudents.length === 0) {
      alert("No data available to download!");
      return;
    }

    setDownloading(true);
    try {
      let dataToExport = allStudents;

      if (totalCount > allStudents.length) {
        const allData = await fetchAllDataForDownload();
        if (allData.length > 0) {
          dataToExport = allData;
        }
      }

      const exportData = prepareExportData(dataToExport);

      const totalPaidAmount = dataToExport.reduce((sum, record) => {
        return sum + (parseFloat(record.total_amount_paid) || 0);
      }, 0);

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Students Fee Records', pageWidth / 2, 15, { align: 'center' });

      let filterText = [];
      if (selectedSchoolYear) filterText.push(`School Year: ${selectedSchoolYear}`);
      if (selectedClass) filterText.push(`Class: ${selectedClass}`);
      if (selectedMonth) filterText.push(`Month: ${selectedMonth}`);
      if (selectedFeeType) filterText.push(`Fee Type: ${selectedFeeType}`);
      if (fromDate && toDate) filterText.push(`Date: ${fromDate} to ${toDate}`);
      if (appliedSearch) filterText.push(`Search: ${appliedSearch}`);

      if (filterText.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Filters: ${filterText.join(' | ')}`, 14, 22);
      }

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

      const tableData = exportData.map(row => Object.values(row));
      const headers = Object.keys(exportData[0] || {});

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 32,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
        },
        didParseCell: function (data) {
          if (data.row.index === data.table.body.length - 1 && data.row.raw.some(cell => String(cell).includes('TOTAL'))) {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 0, 0];
          }
        },
        columnStyles: {
          0: { cellWidth: 12 },
          1: { cellWidth: 25 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20 },
          4: { cellWidth: 18 },
          5: { cellWidth: 25 },
          6: { cellWidth: 40 },
          7: { cellWidth: 35 },
          8: { cellWidth: 25 },
          9: { cellWidth: 25 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: function (data) {
          const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
          const totalPages = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${pageNumber} of ${totalPages}`,
            pageWidth - 30,
            doc.internal.pageSize.getHeight() - 10
          );

          if (data.pageNumber === totalPages) {
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(
              `Total Paid Amount: ${totalPaidAmount.toFixed(2)}`,
              14,
              doc.internal.pageSize.getHeight() - 15
            );
          }
        }
      });

      let filename = "fee_records";
      if (selectedSchoolYear) filename += `_${selectedSchoolYear}`;
      if (selectedClass) filename += `_${selectedClass}`;
      if (selectedMonth) filename += `_${selectedMonth}`;
      filename += `_${new Date().toISOString().split('T')[0]}`;

      doc.save(`${filename}.pdf`);

    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF file. Please try again.");
    } finally {
      setDownloading(false);
    }
  }, [allStudents, totalCount, fetchAllDataForDownload, prepareExportData, selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, appliedSearch]);

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <div className="flex items-start">
            <svg className="w-6 h-6 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold">Error Loading Data</h3>
              <p className="text-sm mt-1">{error}</p>
              <button
                onClick={() => fetchData(currentPage)}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-2 py-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 w-[96%] max-w-[1700px] p-6 rounded-xl shadow-lg mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">
            <i className="fa-solid fa-graduation-cap mr-2"></i> Students Fee Record
          </h1>

          <div className="text-center mt-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {totalCount > 0 ? (
                <>Showing <strong>{allStudents.length}</strong> of <strong>{totalCount}</strong> records</>
              ) : (
                <span className="text-gray-400">📭 No records found</span>
              )}
              {Object.values({ selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, appliedSearch }).some(v => v) && (
                <span className="ml-2 text-blue-600 dark:text-blue-400">🔍 Filtered</span>
              )}
            </span>
          </div>
        </div>

        {/* Filter Section */}
        <div className="w-full px-5">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-2 w-full border-b pb-4 border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-end gap-4 w-full">
              {/* School Year Filter */}
              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Year
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedSchoolYear}
                  onChange={(e) =>
                    handleFilterChange(setSelectedSchoolYear, e.target.value)
                  }
                >
                  <option value="">All Years</option>
                  {schoolYears.map((year) => (
                    <option key={year.id} value={year.year_name}>
                      {year.year_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedClass}
                  onChange={(e) =>
                    handleFilterChange(setSelectedClass, e.target.value)
                  }
                >
                  <option value="">All Classes</option>
                  {yearLevels.map((level) => (
                    <option key={level.id} value={level.level_name}>
                      {level.level_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Month
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedMonth}
                  onChange={(e) =>
                    handleFilterChange(setSelectedMonth, e.target.value)
                  }
                >
                  <option value="">All Months</option>
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fee Type Filter */}
              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fee Type
                </label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={selectedFeeType}
                  onChange={(e) =>
                    handleFilterChange(setSelectedFeeType, e.target.value)
                  }
                >
                  <option value="">All Types</option>
                  <option value="Tuition Fee (General)">Tuition Fee (General)</option>
                  <option value="Tuition Fee (PCM/PCB)">Tuition Fee (PCM/PCB)</option>
                  <option value="Tuition Fee (Comm/Arts)">Tution Fee (Comm/Arts)</option>
                  <option value="Admission Fee">Admission Fee</option>
                  <option value="Exam Fee">Exam Fee</option>
                  <option value="Activity Fee">Activity Fee</option>
                  <option value="Caution Fee">Caution Fee</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Date Range Filters */}
              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={fromDate}
                  onChange={(e) => handleDateChange(setFromDate, e.target.value)}
                />
              </div>

              <div className="flex flex-col w-full sm:w-auto min-w-[150px]">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  value={toDate}
                  onChange={(e) => handleDateChange(setToDate, e.target.value)}
                />
              </div>

              {/* Reset Button */}
              <div className="mt-1 w-full sm:w-auto">
                <button
                  onClick={resetFilters}
                  className="bgTheme text-white text-sm px-5 py-2 rounded font-semibold h-10 w-full sm:w-auto hover:bg-opacity-80 transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* ✅ Search with Button */}
            <div className="flex flex-col w-full sm:flex-row sm:items-end gap-4 sm:w-auto">
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, receipt, scholar..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeyDown}
                  className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="bgTheme text-white px-4 py-2 rounded font-semibold h-10 flex items-center gap-2 hover:bg-opacity-80 transition"
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search
                </button>
              </div>

              <Link
                to={allRouterLink.feeDashboard}
                className="bgTheme text-white text-sm px-5 py-2 rounded font-semibold h-10 w-full sm:w-auto text-center hover:bg-opacity-80 transition"
              >
                Fee Dashboard
              </Link>

              {/* Download Buttons */}
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={downloadExcel}
                  disabled={downloading || allStudents.length === 0}
                  className={`text-white text-sm px-4 py-2 rounded font-semibold h-10 flex items-center justify-center gap-2 transition ${downloading || allStudents.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-green-600 hover:bg-green-700"
                    }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  {downloading ? "..." : "Excel"}
                </button>

                <button
                  onClick={downloadPDF}
                  disabled={downloading || allStudents.length === 0}
                  className={`text-white text-sm px-4 py-2 rounded font-semibold h-10 flex items-center justify-center gap-2 transition ${downloading || allStudents.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                    }`}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  {downloading ? "..." : "PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="w-full overflow-x-auto max-h-[70vh] rounded-lg" ref={tableRef}>
          <table className="min-w-full rounded-lg">
            <thead className="bgTheme text-white sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">S.No</th>
                <th className="px-4 py-3 text-left">Receipt No</th>
                <th className="px-4 py-3 text-left">Student Name</th>
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Section</th>
                <th className="px-4 py-3 text-left">School Year</th>
                <th className="px-4 py-3 text-left">Fee Types</th>
                <th className="px-4 py-3 text-left">Months Paid</th>
                <th className="px-4 py-3 text-left">Payment Date</th>
                <th className="px-4 py-3 text-left">Paid Amount</th>
                <th className="px-4 py-3 text-left">View</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {allStudents.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                        No Records Found
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                        {Object.values({ selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, appliedSearch }).some(v => v)
                          ? "Try adjusting your filters or search criteria"
                          : "No data available to display"}
                      </p>
                      {Object.values({ selectedSchoolYear, selectedClass, selectedMonth, selectedFeeType, fromDate, toDate, appliedSearch }).some(v => v) && (
                        <button
                          onClick={resetFilters}
                          className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                allStudents.map((record, index) => {
                  const monthsPaid = getMonthsFromPayments(record.payments);
                  const feeTypes = getFeeTypesFromPayments(record.payments);

                  return (
                    <tr
                      key={record.receipt_number || index}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {startIndex + index}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.receipt_number}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.student?.name || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.student?.class_name || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.student?.class_section || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.school_year || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                        {feeTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {feeTypes.map((type, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded"
                              >
                                {type}
                              </span>
                            ))}
                          </div>
                        ) : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100">
                        {monthsPaid.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {monthsPaid.map((month, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded"
                              >
                                {month}
                              </span>
                            ))}
                          </div>
                        ) : "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap">
                        {record.payment_date || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-800 dark:text-gray-100 text-nowrap font-semibold">
                        {record.total_amount_paid}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <Link
                          to={allRouterLink.viewFeesDetails
                            .replace(":id", record.student?.student_year_id || record.student?.id)
                            .replace(":receipt_number", record.receipt_number)}
                          className="underline textTheme hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Showing {startIndex}–{endIndex} of {totalCount} entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded border ${currentPage === 1
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bgTheme text-white hover:bg-opacity-80"
                  }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={goToNextPage}
                disabled={!nextUrl}
                className={`px-4 py-2 rounded border ${!nextUrl
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bgTheme text-white hover:bg-opacity-80"
                  }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeSummaryTable;