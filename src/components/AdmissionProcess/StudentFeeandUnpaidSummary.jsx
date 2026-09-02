import { useEffect, useState, useContext } from "react";
import { fetchYearLevels } from "../../services/api/Api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { constants } from "../../global/constants";

const StudentFeeAndUnpaidSummary = () => {
  const [activeTab, setActiveTab] = useState("fee");
  const [details, setDetails] = useState(null);
  const [filteredSummary, setFilteredSummary] = useState([]);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [allFeeTypes, setAllFeeTypes] = useState([]);
  const [selectedMonthFee, setSelectedMonthFee] = useState("");
  const [selectedYearFee, setSelectedYearFee] = useState("");
  const { userRole, yearLevelID, userID, studentID, axiosInstance } =
    useContext(AuthContext);
  const [unpaidFees, setUnpaidFees] = useState([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonthUnpaid, setSelectedMonthUnpaid] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [yearLevels, setYearLevels] = useState([]);
  const { student_id } = useParams();

  const fetchStudentFee = async (student_id) => {
    try {
      const response = await axiosInstance.get(
        `d/studentfees/student-fee-card/`,
        { params: { student_id } }
      );
      return response.data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const fetchUnpaidFees = async ({ role, class_id, student_id, month }) => {
    try {
      let endpoint = "";
      let params = {};
      if (
        role === constants.roles.director ||
        role === constants.roles.officeStaff
      ) {
        endpoint = `/d/studentfees/student_unpaid_fees/`;
        if (class_id) params.class_id = class_id;
        if (month) params.month = month;
      } else if (role === constants.roles.teacher) {
        endpoint = `/d/studentfees/student_unpaid_fees/`;
        if (month) params.month = month;
      } else if (role === constants.roles.student) {
        endpoint = `/d/studentfees/student_unpaid_fees/`;
        if (student_id) params.student_id = student_id;
      } else {
        throw new Error("Invalid role");
      }

      const response = await axiosInstance.get(endpoint, { params });
      let data = response.data;

      // The API returns { unpaid_fees: [...] } structure
      if (data && data.unpaid_fees) {
        data = data.unpaid_fees;
      } else {
        data = [];
      }

      if (
        (role === constants.roles.director ||
          role === constants.roles.officeStaff) &&
        student_id
      ) {
        data = data.filter((fee) => fee.student?.id === parseInt(student_id));
      }
      return data;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const getStudentFeeDetails = async () => {
    if (!student_id) return;
    setLoadingStudent(true);
    try {
      const data = await fetchStudentFee(student_id);
      setDetails(data);
      if (!data?.monthly_summary?.length) {
        setFilteredSummary([]);
        setAllFeeTypes([]);
        return;
      }
      const uniqueTypes = new Set();
      data.monthly_summary.forEach((item) =>
        item.fee_type?.forEach((f) => uniqueTypes.add(f.type))
      );
      setAllFeeTypes([...uniqueTypes]);
      setFilteredSummary(data.monthly_summary);
    } catch {
      setDetails(null);
    } finally {
      setLoadingStudent(false);
    }
  };

  const getYearLevels = async () => {
    try {
      const data = await fetchYearLevels();
      setYearLevels(data);
    } catch {}
  };

  const loadUnpaidFees = async () => {
    try {
      setLoadingUnpaid(true);
      let params = { month: selectedMonthUnpaid || "" };

      if (student_id) {
        params.student_id = student_id;
        params.role = "student";
      } else if (userRole === constants.roles.guardian) {
        params.student_id = studentID || "";
        params.role = "student";
      } else if (userRole === constants.roles.student) {
        params.student_id = userID || "";
        params.role = "student";
      } else if (userRole === constants.roles.teacher) {
        params.class_id = yearLevelID || "";
        params.role = "teacher";
      } else if (
        userRole === constants.roles.director ||
        userRole === constants.roles.officeStaff
      ) {
        params.class_id = selectedClass || "";
        params.role = userRole;
      }

      const data = await fetchUnpaidFees(params);

      setUnpaidFees(Array.isArray(data) ? data : []);
      setError(null);
    } catch {
      setUnpaidFees([]);
      setError("Failed to load unpaid fees");
    } finally {
      setLoadingUnpaid(false);
    }
  };

  useEffect(() => {
    if (student_id) getStudentFeeDetails();
    getYearLevels();
    loadUnpaidFees();
  }, [student_id]);

  useEffect(() => {
    if (!details?.monthly_summary) return;
    let filtered = [...details.monthly_summary];
    if (selectedMonthFee) {
      filtered = filtered.filter((item) =>
        item.month.toLowerCase().includes(selectedMonthFee.toLowerCase())
      );
    }
    if (selectedYearFee) {
      filtered = filtered.filter((item) => item.year === selectedYearFee);
    }
    setFilteredSummary(filtered);
  }, [selectedMonthFee, selectedYearFee, details]);

  useEffect(() => {
    loadUnpaidFees();
  }, [selectedMonthUnpaid, selectedClass, student_id]);

  const resetFilters = () => {
    setSelectedMonthUnpaid("");
    setSelectedClass("");
    setSearchTerm("");
  };

  const filteredFees = unpaidFees.filter((item) =>
    item.student?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportPDF = () => {
    if (!details || !filteredSummary.length) return;
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
        (acc, i) =>
          acc + (i.fee_type.find((f) => f.type === type)?.amount || 0),
        0
      );
      totalRow.push(`₹ ${sum.toFixed(2)}`);
    });
    totalRow.push(
      `₹ ${filteredSummary
        .reduce((sum, i) => sum + i.total_amount, 0)
        .toFixed(2)}`
    );
    totalRow.push(
      `₹ ${filteredSummary
        .reduce((sum, i) => sum + i.due_amount, 0)
        .toFixed(2)}`
    );
    data.push(totalRow);
    autoTable(doc, { startY: 100, head: headers, body: data });
    doc.save(`${details.student_name}_fee_report.pdf`);
  };

  if (loadingStudent || loadingUnpaid) {
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

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 w-full">
        <div>
          <button
            onClick={() => setActiveTab("fee")}
            className={`px-6 py-3 font-semibold text-sm md:text-base ${
              activeTab === "fee"
                ? "border-b-2 border-textTheme textTheme"
                : "text-gray-600 dark:text-gray-300 hover:text-[#5E35B1]"
            }`}
          >
            Fee Report Card
          </button>
          {/* <button
            onClick={() => setActiveTab("unpaid")}
            className={`px-6 py-3 font-semibold text-sm md:text-base ${
              activeTab === "unpaid"
                ? "border-b-2 border-[#5E35B1] text-[#5E35B1]"
                : "text-gray-600 dark:text-gray-300 hover:text-[#5E35B1]"
            }`}
          >
            Unpaid Accounts Summary
          </button> */}
          {userRole !== constants.roles.student && (
            <button
              onClick={() => setActiveTab("unpaid")}
              className={`px-6 py-3 font-semibold text-sm md:text-base ${
                activeTab === "unpaid"
                  ? "border-b-2 border-[#5E35B1] text-[#5E35B1]"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#5E35B1]"
              }`}
            >
              Unpaid Accounts Summary
            </button>
          )}
        </div>

        {activeTab === "fee" && (
          <div className="pt-4">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 text-gray-800 dark:text-white">
              <i className="fa-solid fa-money-check-alt mr-2" />
              {details?.student_name
                ? `${details.student_name}'s Fee Report Card`
                : "Fee Report Card"}
            </h1>

            <div className="w-full max-w-7xl mx-auto">
              <div className="flex flex-wrap justify-start items-end gap-4 mb-6">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search by Month:
                  </label>
                  <select
                    value={selectedMonthFee}
                    onChange={(e) => setSelectedMonthFee(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Months</option>
                    {details?.monthly_summary &&
                      [
                        ...new Set(
                          details.monthly_summary.map((item) => item.month)
                        ),
                      ].map((month, idx) => (
                        <option key={idx} value={month}>
                          {month}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search By Academic Year:
                  </label>
                  <select
                    value={selectedYearFee}
                    onChange={(e) => setSelectedYearFee(e.target.value)}
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="">All Years</option>
                    {details?.monthly_summary &&
                      [
                        ...new Set(
                          details.monthly_summary
                            .map((item) => item.year)
                            .filter(Boolean)
                        ),
                      ].map((year, idx) => (
                        <option key={idx} value={year}>
                          {year}
                        </option>
                      ))}
                  </select>
                </div>

                {filteredSummary.length > 0 && (
                  <div className="mt-1">
                    <button
                      onClick={exportPDF}
                      className="btn bgTheme text-white"
                    >
                      <i className="fa-solid fa-download mr-2" /> Download
                      Report
                    </button>
                  </div>
                )}
              </div>
            </div>

            {!details?.monthly_summary || filteredSummary.length === 0 ? (
              <div className="text-center py-6 text-red-600 dark:text-red-400 font-semibold">
                Fees Not Found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                  <thead className="bgTheme text-white">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                        Month
                      </th>
                      {allFeeTypes.map((type, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold"
                        >
                          {type}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap text-sm font-semibold">
                        Total
                      </th>
                      <th className="px-4 py-3 text-left text-nowrap whitespace-nowrap text-sm font-semibold">
                        Dues
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {filteredSummary.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-blue-50 text-nowrap dark:hover:bg-gray-700"
                      >
                        <td className="px-4 py-3 text-sm text-nowrap text-gray-900 dark:text-gray-100">
                          {item.month}
                        </td>
                        {allFeeTypes.map((type, i) => {
                          const amount =
                            item.fee_type.find((f) => f.type === type)
                              ?.amount || 0;
                          return (
                            <td
                              key={i}
                              className="px-4 py-3 text-nowrap text-sm text-gray-600 dark:text-gray-300"
                            >
                              ₹{amount.toFixed(2)}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                          ₹{item.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-nowrap text-red-600 dark:text-red-400 font-medium">
                          ₹{item.due_amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* UNPAID TAB */}
      {activeTab === "unpaid" && (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 w-full mt-6">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">
              <i className="fa-solid fa-graduation-cap mr-2" /> Unpaid Accounts
              Summary
            </h1>
          </div>

          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-start items-end gap-4 mb-6">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search by Month:
                </label>
                <select
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
                  value={selectedMonthUnpaid}
                  onChange={(e) => setSelectedMonthUnpaid(e.target.value)}
                >
                  <option value="">All Months</option>
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              {/* 
              {(userRole === constants.roles.director ||
                userRole === constants.roles.officeStaff) && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search by Class:
                  </label>
                  <select
                    className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {yearLevels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.level_name}
                      </option>
                    ))}
                  </select>
                </div>
              )} */}

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search Student by Name:
                </label>
                <input
                  type="text"
                  placeholder="Enter student name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2 text-sm w-64"
                />
              </div>

              <div className="mt-1">
                <button
                  onClick={resetFilters}
                  className="btn bgTheme text-white"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {filteredFees.length === 0 ? (
            <div className="text-center py-6 text-red-600 dark:text-red-400 font-semibold">
              Unpaid Summary Not Found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                <thead className="bgTheme text-white">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      S.No
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Student Name
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Scholar No.
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Paid Amount
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap text-nowrap text-sm font-semibold">
                      Due Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.map((item, index) => (
                    <tr
                      key={`${item.student?.id}-${item.month}`}
                      className="hover:bg-blue-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        {item.student?.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        {item.student?.scholar_number}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        {item.year_level_fees_grouped?.[0]?.year_level || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        {item.month}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        ₹{item.total_amount}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-gray-600 dark:text-gray-300">
                        ₹{item.paid_amount}
                      </td>
                      <td className="px-4 py-3 text-sm text-nowrap text-red-600 dark:text-red-400 font-medium">
                        ₹{item.due_amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentFeeAndUnpaidSummary;
