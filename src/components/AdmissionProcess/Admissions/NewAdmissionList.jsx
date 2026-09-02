import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../../context/AuthContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const LIMIT = 10;

const NewAdmissionList = () => {
  const { axiosInstance } = useContext(AuthContext);

  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Store all students for filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [count, setCount] = useState(0);
  const [schoolYear, setSchoolYear] = useState("");

  const [offset, setOffset] = useState(0);

  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const dropdownRef = useRef(null);

  const [filters, setFilters] = useState({
    search: "",
    year_level: "",
  });

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDownloadOptions(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ------------------------------------------------------------
  // FETCH ADMISSIONS (current page)
  // ------------------------------------------------------------
  const getAdmissions = async () => {
    try {
      setLoading(true);

      const params = {
        limit: LIMIT,
        offset,
      };

      const res = await axiosInstance.get("d/new-admission/", {
        params,
      });

      setStudents(res.data.results || []);
      setSchoolYear(res.data.school_year || "");
      setCount(res.data.count || 0);
      setError(false);
    } catch (err) {
      console.log(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // FETCH ALL STUDENTS FOR FILTERING AND DOWNLOAD
  // ------------------------------------------------------------
  const fetchAllStudents = async () => {
    try {
      const res = await axiosInstance.get("d/new-admission/");
      return res.data.results || [];
    } catch (err) {
      console.error("Error fetching all students:", err);
      return [];
    }
  };

  // Load all students when component mounts
  useEffect(() => {
    const loadAllData = async () => {
      const allData = await fetchAllStudents();
      setAllStudents(allData);
    };
    loadAllData();
  }, []);

  useEffect(() => {
    getAdmissions();
  }, [offset]);

  const resetFilters = () => {
    setFilters({
      search: "",
      year_level: "",
    });
    setOffset(0);
  };

  // ------------------------------------------------------------
  // FILTER ALL STUDENTS (NOT just current page)
  // ------------------------------------------------------------
  const getFilteredAllStudents = () => {
    return allStudents.filter((student) => {
      const fullName = `${student.student_input?.first_name || ""} ${
        student.student_input?.middle_name || ""
      } ${student.student_input?.last_name || ""}`.toLowerCase();

      const search = filters.search.toLowerCase();

      const matchesSearch =
        fullName.includes(search) ||
        (student.student_input?.roll_number || "")
          .toLowerCase()
          .includes(search);

      // ✅ Fixed: Exact match with normalization
      const studentClass = (student.year_level || "").trim();
      const filterClass = (filters.year_level || "").trim();
      
      const matchesClass = !filters.year_level || studentClass === filterClass;

      return matchesSearch && matchesClass;
    });
  };

  // Get filtered students for current page display
  const getFilteredStudentsForPage = () => {
    const filtered = getFilteredAllStudents();
    // Paginate the filtered results
    const start = offset;
    const end = offset + LIMIT;
    return filtered.slice(start, end);
  };

  // Get total count of filtered students
  const getFilteredCount = () => {
    return getFilteredAllStudents().length;
  };

  // Display students for current page
  const displayStudents = getFilteredStudentsForPage();
  const displayCount = getFilteredCount();

  // ------------------------------------------------------------
  // UNIFIED DOWNLOAD HANDLER - Uses allStudents with filters
  // ------------------------------------------------------------
  const handleDownload = async (type) => {
    setShowDownloadOptions(false);
    setIsDownloading(true);

    try {
      // Use already fetched allStudents or fetch if empty
      let dataToExport = allStudents;
      
      if (!dataToExport.length) {
        dataToExport = await fetchAllStudents();
        setAllStudents(dataToExport);
      }

      // Apply current filters to download data
      const filteredData = dataToExport.filter((student) => {
        const fullName = `${student.student_input?.first_name || ""} ${
          student.student_input?.middle_name || ""
        } ${student.student_input?.last_name || ""}`.toLowerCase();

        const search = filters.search.toLowerCase();

        const matchesSearch =
          fullName.includes(search) ||
          (student.student_input?.roll_number || "")
            .toLowerCase()
            .includes(search);

        const studentClass = (student.year_level || "").trim();
        const filterClass = (filters.year_level || "").trim();
        
        const matchesClass = !filters.year_level || studentClass === filterClass;

        return matchesSearch && matchesClass;
      });

      if (!filteredData.length) {
        alert("No data to export with current filters.");
        return;
      }

      if (type === "pdf") {
        handleDownloadStudentDataPDF(filteredData);
      } else if (type === "excel") {
        handleDownloadExcel(filteredData);
      }
    } catch (err) {
      console.error(err);
      alert("Export failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  // ------------------------------------------------------------
  // NORMALIZE STUDENTS – UI‑visible fields
  // ------------------------------------------------------------
  const normalizeStudents = (students) => {
    return students.map((student) => {
      const s = student.student_input || {};
      const g = student.guardian_input || {};

      const nameParts = [s.first_name, s.middle_name, s.last_name]
        .filter(Boolean)
        .join(" ");

      return {
        id: student.id,
        roll_number: s.roll_number || "",
        student_name: nameParts || "",
        father_name: s.father_name || "",
        class: student.year_level || "",
        mobile: s.contact_number || g.phone_no || "",
        admission_date: student.admission_date || "",
        previous_school: student.previous_school_name || "",
      };
    });
  };

  // ------------------------------------------------------------
  // EXCEL EXPORT
  // ------------------------------------------------------------
  const handleDownloadExcel = (input = []) => {
    const data = normalizeStudents(input);
    if (!data.length) {
      alert("No data to export.");
      return;
    }

    const formattedData = data.map((s) => ({
      ID: s.id,
      "Roll No": s.roll_number,
      "Student Name": s.student_name,
      "Father's Name": s.father_name,
      Class: s.class,
      Mobile: s.mobile,
      "Admission Date": s.admission_date
        ? new Date(s.admission_date).toLocaleDateString("en-GB")
        : "",
      "Previous School": s.previous_school,
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "New Admissions");

    XLSX.writeFile(workbook, "New_Admissions_Report.xlsx");
  };

  // ------------------------------------------------------------
  // PDF EXPORT (landscape A3)
  // ------------------------------------------------------------
  const handleDownloadStudentDataPDF = (input = []) => {
    const data = normalizeStudents(input);
    if (!data.length) {
      alert("No data to export.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("New Admission List Report", margin, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 12, {
      align: "right",
    });
    doc.text(`School Year: ${schoolYear}`, margin, 18);
    
    // Add filter info if applied
    if (filters.year_level) {
      doc.text(`Class Filter: ${filters.year_level}`, margin, 24);
    }
    if (filters.search) {
      doc.text(`Search: "${filters.search}"`, margin, 30);
    }

    const body = data.map((s) => [
      s.id,
      s.roll_number,
      s.student_name,
      s.father_name,
      s.class,
      s.mobile,
      s.admission_date ? new Date(s.admission_date).toLocaleDateString("en-GB") : "",
      s.previous_school,
    ]);

    const startY = filters.year_level || filters.search ? 34 : 24;

    autoTable(doc, {
      startY: startY,
      theme: "grid",
      showHead: "everyPage",
      head: [
        [
          "ID",
          "Roll No",
          "Student Name",
          "Father's Name",
          "Class",
          "Mobile",
          "Admission Date",
          "Previous School",
        ],
      ],
      body,
      margin: { top: 20, left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 40 },
        3: { cellWidth: 30 },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 30 },
        6: { cellWidth: 28, halign: "center" },
        7: { cellWidth: 35 },
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 6,
          { align: "right" }
        );
      },
    });

    doc.save("New_Admissions_Report.pdf");
  };

  // ------------------------------------------------------------
  // LOADING / ERROR STATES
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <i className="fa-solid fa-circle-exclamation text-red-500 text-5xl mb-4"></i>
        <p className="text-red-500 text-lg">Failed to load new admissions.</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // MAIN RENDER
  // ------------------------------------------------------------
  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-center text-3xl font-bold text-gray-800 dark:text-white">
            New Admission List
          </h1>
          <p className="text-center text-gray-500 mt-2">
            School Year : {schoolYear}
          </p>
          {filters.year_level && (
            <p className="text-center text-blue-600 dark:text-blue-400 mt-1">
              Filtered by Class: {filters.year_level}
            </p>
          )}
          {filters.search && (
            <p className="text-center text-blue-600 dark:text-blue-400 mt-1">
              Search: "{filters.search}"
            </p>
          )}
        </div>

        {/* Filters + Download */}
        <div className="border-b border-gray-300 dark:border-gray-700 pb-5 mb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="select select-bordered w-48 dark:bg-gray-700 dark:text-white"
                value={filters.year_level}
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    year_level: e.target.value,
                  });
                  setOffset(0); // Reset pagination when filter changes
                }}
              >
                <option value="">All Classes</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`Class ${i + 1}`}>
                    Class {i + 1}
                  </option>
                ))}
              </select>

              <button 
                className="btn bgTheme text-white" 
                onClick={resetFilters}
              >
                Reset
              </button>

              {/* Download Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  className="btn bgTheme text-white"
                  onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                  disabled={isDownloading}
                >
                  <i className="fa-solid fa-download mr-2"></i>
                  {isDownloading ? "Loading..." : "Download New Admissions List"}
                </button>

                {showDownloadOptions && (
                  <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleDownload("pdf")}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                      disabled={isDownloading}
                    >
                      <i className="fa-solid fa-file-pdf mr-2 text-red-500"></i>
                      Download as PDF
                    </button>
                    <button
                      onClick={() => handleDownload("excel")}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-white"
                      disabled={isDownloading}
                    >
                      <i className="fa-solid fa-file-excel mr-2 text-green-500"></i>
                      Download as Excel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <input
              type="text"
              placeholder="Search Student..."
              className="input input-bordered w-full md:w-72 dark:bg-gray-700 dark:text-white"
              value={filters.search}
              onChange={(e) => {
                setFilters({
                  ...filters,
                  search: e.target.value,
                });
                setOffset(0); // Reset pagination when search changes
              }}
            />
          </div>
        </div>

        {/* Table */}
        {displayStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <i className="fa-solid fa-user-slash text-5xl text-gray-400 mb-4"></i>
            <p className="text-gray-500 dark:text-gray-300">
              No New Admissions Found
            </p>
            {filters.year_level && (
              <p className="text-sm text-gray-400 mt-2">
                No students found in Class {filters.year_level}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg">
            <table className="table w-full">
              <thead className="bgTheme text-white sticky top-0 z-10">
                <tr>
                  <th>S.NO</th>
                  <th>Student</th>
                  <th>Father's Name</th>
                  <th>Class</th>
                  <th>Mobile</th>
                  <th>Admission Date</th>
                  <th>Previous School</th>
                </tr>
              </thead>
              <tbody>
                {displayStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td>{offset + index + 1}.</td>
                    <td>
                      <div>
                        <p className="font-semibold dark:text-white">
                          {student.student_input?.first_name || ""}{" "}
                          {student.student_input?.middle_name || ""}{" "}
                          {student.student_input?.last_name || ""}
                        </p>
                        {student.student_input?.roll_number && (
                          <p className="text-xs text-gray-500">
                            Roll: {student.student_input?.roll_number}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="dark:text-gray-300">
                      {student.student_input?.father_name || "-"}
                    </td>
                    <td className="dark:text-gray-300">
                      {student.year_level || "-"}
                    </td>
                    <td className="dark:text-gray-300">
                      {student.student_input?.contact_number ||
                        student.guardian_input?.phone_no ||
                        "-"}
                    </td>
                    <td className="dark:text-gray-300">
                      {student.admission_date
                        ? new Date(student.admission_date).toLocaleDateString(
                            "en-GB"
                          )
                        : "-"}
                    </td>
                    <td className="dark:text-gray-300">
                      {student.previous_school_name || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Showing {displayStudents.length} of {displayCount} Students
            {filters.year_level && ` in Class ${filters.year_level}`}
          </p>
          <div className="join">
            <button
              className="join-item btn dark:bg-gray-700 dark:text-white"
              disabled={offset === 0}
              onClick={() => setOffset((prev) => Math.max(prev - LIMIT, 0))}
            >
              Previous
            </button>
            <button className="join-item btn btn-disabled dark:bg-gray-600 dark:text-white">
              {Math.floor(offset / LIMIT) + 1}
            </button>
            <button
              className="join-item btn dark:bg-gray-700 dark:text-white"
              disabled={offset + LIMIT >= displayCount}
              onClick={() => setOffset(offset + LIMIT)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewAdmissionList;