import React, { useEffect, useState, useContext, useRef, useCallback } from "react";
import { fetchYearLevels } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const UnpaidFeesList = () => {
  const { userRole, yearLevelID, userID, studentID, axiosInstance } = useContext(AuthContext);

  const [unpaidFees, setUnpaidFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Input value
  const [appliedSearch, setAppliedSearch] = useState(""); // Actual search value
  const [yearLevels, setYearLevels] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loder, setLoder] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const dropdownRef = useRef(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const isInitialLoadDone = useRef(false);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getYearLevels = async () => {
    try {
      const data = await fetchYearLevels();
      setYearLevels(data);
    } catch (err) {
      console.error("Error fetching year levels:", err);
    }
  };

  // ============== FETCH ALL DATA FOR EXPORT ==============
  const fetchAllDataForExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      if (selectedMonth) {
        const monthNumber = new Date(`${selectedMonth} 1, 2000`).getMonth() + 1;
        params.append('month', monthNumber);
      }
      
      if (selectedClass) {
        const selectedLevel = yearLevels.find(level => level.level_name === selectedClass);
        if (selectedLevel) {
          params.append('class_id', selectedLevel.id);
        }
      }

      if (appliedSearch.trim()) {
        params.append('student_name', appliedSearch.trim());
      }

      params.append('download', 'true');

      const response = await axiosInstance.get(`/d/studentfees/overdue_fees/?${params.toString()}`);
      
      if (response.data && response.data.results) {
        return response.data.results;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (err) {
      console.error("Error fetching all data:", err);
      return [];
    }
  }, [selectedMonth, selectedClass, appliedSearch, yearLevels, axiosInstance]);

  // ============== LOAD PAGINATED DATA ==============
  const loadUnpaidFees = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('limit', itemsPerPage);
      params.append('offset', (currentPage - 1) * itemsPerPage);
      
      if (selectedMonth) {
        const monthNumber = new Date(`${selectedMonth} 1, 2000`).getMonth() + 1;
        params.append('month', monthNumber);
      }
      
      if (selectedClass) {
        const selectedLevel = yearLevels.find(level => level.level_name === selectedClass);
        if (selectedLevel) {
          params.append('class_id', selectedLevel.id);
        }
      }

      if (appliedSearch.trim()) {
        params.append('student_name', appliedSearch.trim());
      }

      const response = await axiosInstance.get(`/d/studentfees/overdue_fees/?${params.toString()}`);
      
      if (response.data && response.data.results) {
        setUnpaidFees(response.data.results);
        setTotalItems(response.data.count || 0);
      } else {
        setUnpaidFees([]);
        setTotalItems(0);
      }
      
      setError(null);
    } catch (err) {
      console.error("Error fetching unpaid fees:", err.response?.data || err.message);
      setError("Failed to load unpaid fees");
      setUnpaidFees([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedClass, appliedSearch, currentPage, itemsPerPage, yearLevels, axiosInstance]);

  // ===================== EXPORT FUNCTIONS =====================

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      const data = await fetchAllDataForExport();
      
      if (!data || data.length === 0) {
        setModalMessage("No data available to export!");
        setShowModal(true);
        setLoading(false);
        return;
      }

      const formattedData = data.map((item, index) => ({
        'S.No': index + 1,
        'Student Name': item.student_name || '',
        'Class': item.class_name || '',
        'Month': item.month || '',
        'Fee Type': item.fee_type || '',
        'Total Amount': item.original_amount || 0,
        'Paid Amount': item.paid_amount || 0,
        'Due Amount': item.due_amount || 0,
        'Payment Status': item.status || (parseFloat(item.due_amount) <= 0 ? 'Paid' : 'Unpaid')
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Unpaid Fees");
      
      const colWidths = [
        { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, 
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      worksheet['!cols'] = colWidths;

      XLSX.writeFile(workbook, `Unpaid_Fees_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      setModalMessage(`Excel file downloaded successfully! (${data.length} records)`);
      setShowModal(true);
    } catch (err) {
      console.error("Error exporting Excel:", err);
      setModalMessage("Failed to export Excel file!");
      setShowModal(true);
    } finally {
      setLoading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const data = await fetchAllDataForExport();
      
      if (!data || data.length === 0) {
        setModalMessage("No data available to export!");
        setShowModal(true);
        setLoading(false);
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 14;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Unpaid Fees Report', margin, 15);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 15, { align: 'right' });
      
      let filterText = 'Filters Applied: ';
      const filters = [];
      if (selectedMonth) filters.push(`Month: ${selectedMonth}`);
      if (selectedClass) filters.push(`Class: ${selectedClass}`);
      if (appliedSearch) filters.push(`Search: ${appliedSearch}`);
      filterText += filters.length > 0 ? filters.join(' | ') : 'All Records';
      
      doc.setFontSize(9);
      doc.text(filterText, margin, 22);
      doc.text(`Total Records: ${data.length}`, pageWidth - margin, 22, { align: 'right' });

      const headers = ['S.No', 'Student Name', 'Class', 'Month', 'Fee Type', 'Total (₹)', 'Paid (₹)', 'Due (₹)', 'Status'];
      const tableBody = data.map((item, index) => [
        (index + 1).toString(),
        item.student_name || '',
        item.class_name || '',
        item.month || '',
        item.fee_type || '',
        item.original_amount?.toString() || '0',
        item.paid_amount?.toString() || '0',
        item.due_amount?.toString() || '0',
        item.status || (parseFloat(item.due_amount) <= 0 ? 'Paid' : 'Unpaid')
      ]);

      autoTable(doc, {
        startY: 28,
        head: [headers],
        body: tableBody,
        theme: 'striped',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center',
        },
        bodyStyles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 35 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 28 },
          5: { cellWidth: 18, halign: 'right' },
          6: { cellWidth: 18, halign: 'right' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: 'right' }
          );
        },
      });

      doc.save(`Unpaid_Fees_${new Date().toISOString().split('T')[0]}.pdf`);
      
      setModalMessage(`PDF file downloaded successfully! (${data.length} records)`);
      setShowModal(true);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      setModalMessage("Failed to export PDF file!");
      setShowModal(true);
    } finally {
      setLoading(false);
      setShowDownloadOptions(false);
    }
  };

  const handleSendNotifications = async () => {
    try {
      setLoder(true);
      const response = await axiosInstance.get("/d/fee-record/student_unpaid_fees/");
      setNotifications(response.data.notifications || []);
      setModalMessage("WhatsApp notifications sent successfully!");
      setShowModal(true);
    } catch (err) {
      setModalMessage("Failed to send notifications!");
      setShowModal(true);
    } finally {
      setLoder(false);
    }
  };

  // ===================== USE EFFECTS =====================

  useEffect(() => {
    getYearLevels();
  }, []);

  useEffect(() => {
    if (yearLevels.length > 0 && !isInitialLoadDone.current) {
      isInitialLoadDone.current = true;
      loadUnpaidFees();
    }
  }, [yearLevels, loadUnpaidFees]);

  // Reload when filters change (excluding searchTerm)
  useEffect(() => {
    if (isInitialLoadDone.current && yearLevels.length > 0) {
      loadUnpaidFees();
    }
  }, [selectedMonth, selectedClass, appliedSearch, currentPage, itemsPerPage, loadUnpaidFees, yearLevels]);

  // ===================== HANDLERS =====================

  const resetFilters = () => {
    setSelectedMonth("");
    setSelectedClass("");
    setSearchTerm("");
    setAppliedSearch("");
    setCurrentPage(1);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
      searchInputRef.current.focus();
    }
  };

  // FIXED: Only updates input value, doesn't trigger search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // DO NOT trigger search here
  };

  // FIXED: Search on button click or Enter key
  const handleSearch = () => {
    setAppliedSearch(searchTerm);
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(totalItems / itemsPerPage)) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const sortedFees = [...unpaidFees].sort((a, b) =>
    (a.student_name || "").localeCompare(b.student_name || "", undefined, { sensitivity: "base" })
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // ===================== RENDER =====================

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce" style={{ animationDelay: "0s" }}></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 max-w-7xl p-6 rounded-lg shadow-lg mx-auto">
        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center mb-4">
            <i className="fa-solid fa-graduation-cap mr-2"></i> Overdue Accounts Summary
          </h1>
        </div>

        {/* Filter Section */}
        <div className="w-full px-5">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6 w-full border-b border-gray-300 dark:border-gray-700 pb-4">
            <div className="flex flex-wrap items-end gap-4 w-full sm:w-auto">
              {/* Month Filter */}
              <div className="flex flex-col w-full sm:w-auto">
                <label className="text-sm font-medium mb-1">Search by Month</label>
                <select
                  className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">All Months</option>
                  {[
                    "January", "February", "March", "April", "May", "June", "July",
                    "August", "September", "October", "November", "December",
                  ].map((month) => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              {(userRole === constants.roles.director || userRole === constants.roles.officeStaff) && (
                <div className="flex flex-col w-full sm:w-auto">
                  <label className="text-sm font-medium mb-1">Search by Class</label>
                  <select
                    className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">All Classes</option>
                    {yearLevels.map((level) => (
                      <option key={level.id} value={level.level_name}>{level.level_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Button */}
              <div className="mt-1 w-full sm:w-auto">
                <button
                  onClick={resetFilters}
                  className="btn bgTheme text-white"
                  type="button"
                >
                  Reset Filters
                </button>
              </div>

              {/* Download Dropdown */}
              <div className="mt-1 w-full sm:w-auto relative" ref={dropdownRef}>
                <button
                  className="btn bgTheme text-white flex items-center"
                  onClick={() => setShowDownloadOptions((prev) => !prev)}
                  type="button"
                >
                  <i className="fa-solid fa-file-arrow-down mr-2"></i> Download
                  <i className={`fa-solid fa-caret-down ml-2 transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`}></i>
                </button>

                {showDownloadOptions && (
                  <div className="absolute z-10 mt-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg min-w-[200px]">
                    <button
                      onClick={handleDownloadPDF}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg"
                      type="button"
                    >
                      <i className="fa-solid fa-file-pdf mr-2 text-red-500"></i> Download as PDF
                    </button>
                    <button
                      onClick={handleDownloadExcel}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-b-lg"
                      type="button"
                    >
                      <i className="fa-solid fa-file-excel mr-2 text-green-500"></i> Download as Excel (.xlsx)
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Search with Button */}
            <div className="flex items-end gap-2 w-full sm:w-auto justify-end">
              <div className="flex flex-col w-full sm:w-auto">
                <div className="flex gap-2">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Enter student name"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onKeyDown={handleSearchKeyDown}
                    className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  />
                  <button
                    onClick={handleSearch}
                    className="btn bgTheme text-white px-4"
                    type="button"
                  >
                    <i className="fa-solid fa-search"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto rounded-lg no-scrollbar max-h-[70vh]">
          <table className="min-w-full table-auto divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bgTheme text-white sticky top-0 z-2">
              <tr>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">S.No</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Student Name</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Class</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Month</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Fee Type</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Total Amount</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Paid Amount</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Due Amount</th>
                <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {sortedFees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-6 text-gray-500 dark:text-gray-400">
                    No data found.
                  </td>
                </tr>
              ) : (
                sortedFees.map((item, index) => {
                  const isPaid = parseFloat(item.due_amount) <= 0 || item.status?.toLowerCase() === "paid";
                  return (
                    <tr key={`${item.fee_id || 'fee'}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-4 py-3 text-nowrap font-bold">{item.student_name}</td>
                      <td className="px-4 py-3 text-nowrap">{item.class_name}</td>
                      <td className="px-4 py-3 text-nowrap">{item.month}</td>
                      <td className="px-4 py-3 text-nowrap">{item.fee_type}</td>
                      <td className="px-4 py-3 text-nowrap">₹{item.original_amount}</td>
                      <td className="px-4 py-3 text-nowrap">₹{item.paid_amount}</td>
                      <td className="px-4 py-3 text-nowrap">₹{item.due_amount}</td>
                      <td
                        className={`inline-flex items-center px-3 py-1 rounded-md shadow-sm text-sm font-medium m-2 ${
                          isPaid ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        }`}
                      >
                        {item.status || (isPaid ? "Paid" : "Unpaid")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center gap-2">
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
              </span>
            </div>
            <div className="join">
              <button
                className="join-item btn dark:bg-gray-700 dark:text-white"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                type="button"
              >
                Previous
              </button>
              <button className="join-item btn btn-disabled dark:bg-gray-600 dark:text-white" type="button">
                {currentPage}
              </button>
              <button
                className="join-item btn dark:bg-gray-700 dark:text-white"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => handlePageChange(currentPage + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Notification</h3>
            <p className="py-4 whitespace-pre-line">{modalMessage}</p>
            <div className="modal-action">
              <button className="btn bgTheme text-white w-32" onClick={() => setShowModal(false)}>OK</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default UnpaidFeesList;