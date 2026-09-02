import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const StudentFeeCard = () => {
  const { student_id } = useParams();
  const { axiosInstance } = useContext(AuthContext);

  const [details, setDetails] = useState(null);
  const [filteredSummary, setFilteredSummary] = useState([]);
  const [allFeeTypes, setAllFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  const fetchStudentFee = async () => {
    try {
      setLoading(true);
      setError(false);

      const { data } = await axiosInstance.get(
        `/d/fee-record/student-fee-card/?student_id=${student_id}`
      );

      if (!data || !Array.isArray(data.monthly_summary)) {
        setDetails(null);
        setFilteredSummary([]);
        setAllFeeTypes([]);
        setLoading(false);
        return;
      }

      setDetails(data);

      const uniqueTypes = new Set();
      data.monthly_summary.forEach((item) => {
        item.fee_type?.forEach((f) => uniqueTypes.add(f.type));
      });
      setAllFeeTypes([...uniqueTypes]);
      setFilteredSummary(data.monthly_summary);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch student fee:", err);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (student_id) fetchStudentFee();
  }, [student_id]);

  useEffect(() => {
    if (!details) return;
    let filtered = [...details.monthly_summary];

    if (selectedMonth) {
      filtered = filtered.filter((item) =>
        item.month.toLowerCase().includes(selectedMonth.toLowerCase())
      );
    }
    if (selectedYear) {
      filtered = filtered.filter((item) => item.year === selectedYear);
    }

    setFilteredSummary(filtered);
  }, [selectedMonth, selectedYear, details]);

  const exportPDF = () => {
    if (!details || !filteredSummary) return;

    const doc = new jsPDF("portrait", "pt", "A3");
    const margin = 40;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 64, 175);
    doc.text(`${details.student_name}'s Fee Report`, margin, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    doc.text(`Class: ${details.year_level}`, margin, 70);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, 85);

    const headers = [["Month", ...allFeeTypes, "Total Amount", "Dues"]];
    const data = filteredSummary.map((item) => {
      const row = [item.month];
      allFeeTypes.forEach((type) => {
        const fee = item.fee_type.find((f) => f.type === type)?.amount || 0;
        row.push(`₹ ${fee.toFixed(2)}`);
      });
      row.push(`₹ ${item.total_amount.toFixed(2)}`);
      row.push(`₹ ${item.due_amount.toFixed(2)}`);
      return row;
    });

    const totalRow = ["Total"];
    allFeeTypes.forEach((type) => {
      const sum = filteredSummary.reduce(
        (acc, i) => acc + (i.fee_type.find((f) => f.type === type)?.amount || 0),
        0
      );
      totalRow.push(`₹ ${sum.toFixed(2)}`);
    });
    totalRow.push(`₹ ${filteredSummary.reduce((sum, i) => sum + i.total_amount, 0).toFixed(2)}`);
    totalRow.push(`₹ ${filteredSummary.reduce((sum, i) => sum + i.due_amount, 0).toFixed(2)}`);
    data.push(totalRow);

    autoTable(doc, {
      startY: 100,
      head: headers,
      body: data,
      styles: {
        font: "helvetica",
        fontSize: 10,
        halign: "center",
        valign: "middle",
        cellPadding: { top: 8, bottom: 8, left: 14, right: 14 },
        textColor: [33, 37, 41],
      },
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 11,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      margin: { left: margin, right: margin },
    });

    doc.save(`${details.student_name}_fee_report.pdf`);
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

  if (!details) {
    return (
      <div className="p-4 text-center text-red-600 font-medium">
        No fee data available for this student.
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-lg p-6 flex flex-col md:flex-row gap-6">
        {/* Left Filters */}
        <div className="flex flex-col w-full md:w-1/4 gap-4">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Months</option>
            {[...new Set(details.monthly_summary.map((item) => item.month))].map(
              (month, idx) => (
                <option key={idx} value={month}>
                  {month}
                </option>
              )
            )}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Years</option>
            {[...new Set(details.monthly_summary.map((item) => item.year).filter(Boolean))].map(
              (year, idx) => (
                <option key={idx} value={year}>
                  {year}
                </option>
              )
            )}
          </select>

          <button
            onClick={exportPDF}
            className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium px-4 py-2 rounded border border-blue-300"
          >
            <i className="fa-solid fa-download mr-2" /> Download Report
          </button>
        </div>

        {/* Right Table */}
        <div className="flex-1 overflow-x-auto rounded-lg no-scrollbar max-h-[70vh]">
          {filteredSummary.length === 0 ? (
            <div className="text-center text-gray-600">No fee records found.</div>
          ) : (
            <table className="min-w-full table-auto border border-gray-300">
              <thead className="bgTheme text-white sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Month</th>
                  {allFeeTypes.map((type, i) => (
                    <th key={i} className="px-4 py-3 text-left text-sm font-semibold">
                      {type}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredSummary.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.month}
                    </td>
                    {allFeeTypes.map((type, i) => {
                      const amount = item.fee_type.find((f) => f.type === type)?.amount || 0;
                      return (
                        <td key={i} className="px-4 py-3 text-sm text-gray-500">
                          ₹{amount.toFixed(2)}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      ₹{item.total_amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">
                      ₹{item.due_amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentFeeCard;
