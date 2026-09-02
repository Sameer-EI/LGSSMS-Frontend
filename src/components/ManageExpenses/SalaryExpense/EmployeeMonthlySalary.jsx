import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { constants } from "../../../global/constants";
import axios from "axios";
import { allRouterLink } from "../../../router/AllRouterLinks";
import { Loader } from "../../../global/Loader";
import { fetchSchoolYear } from "../../../services/api/Api";

export const EmployeeMonthlySalary = () => {
  const { id } = useParams();
  const authTokens = JSON.parse(localStorage.getItem("authTokens"));
  const access = authTokens?.access;

  const [employeeName, setEmployeeName] = useState("");
  const [employeeDetails, setEmployeeDetails] = useState([]);
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const getEmployee = async () => {
    try {
      const response = await axios.get(
        `${constants.baseUrl}/d/Employee/get_emp/?id=${id}`,
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );
      setEmployeeName(response.data.name);
    } catch (error) {
      console.error(error);
      setApiError("Failed to fetch employee data");
    }
  };

  const getSchoolYears = async () => {
    try {
      const data = await fetchSchoolYear();
      setSchoolYears(data);
    } catch (error) {
      console.error(error);
    }
  };

  const getEmployeeDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${constants.baseUrl}/d/Employee-salary/?user=${id}`,
        {
          headers: { Authorization: `Bearer ${access}` },
        }
      );
      setEmployeeDetails(response.data);
    } catch (error) {
      console.error(error);
      setApiError("Failed to fetch salary details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getEmployee();
    getEmployeeDetails();
    getSchoolYears();
  }, [id]);

  if (loading) return <Loader />;

  // Helper function to normalize payment status (case-insensitive)
  const normalizePaymentStatus = (status) => {
    if (!status) return "";
    const statusLower = status.toLowerCase();
    if (statusLower === "success" || statusLower === "paid") return "Paid";
    if (statusLower === "pending") return "Pending";
    if (statusLower === "failed") return "Failed";
    return status; // Return original if no match
  };

  // Get status color (case-insensitive)
  const getStatusColor = (status) => {
    if (!status) return "";
    const statusLower = status.toLowerCase();
    if (statusLower === "success" || statusLower === "paid")
      return "bg-green-100 text-green-800 px-5";
    if (statusLower === "pending") return "bg-yellow-100 text-yellow-800";
    if (statusLower === "failed") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const filteredDetails = employeeDetails.filter((detail) => {
    const matchMonth = selectedMonth ? detail.month === selectedMonth : true;
    const matchYear = selectedSchoolYear
      ? detail.school_year_name === selectedSchoolYear
      : true;
    return matchMonth && matchYear;
  });

  // Create map for easier lookup by month
  const employeeDetailsMap = employeeDetails.reduce((acc, detail) => {
    acc[detail.month] = detail;
    return acc;
  }, {});

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4  border-gray-200 dark:border-gray-700">
            {employeeName} Salary Record
          </h1>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-start">
            {/* Month */}
            <select
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">Select Month</option>
              {constants.allMonths.map((month, idx) => (
                <option key={idx} value={month}>
                  {month}
                </option>
              ))}
            </select>

            {/* School Year */}
            <select
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedSchoolYear}
              onChange={(e) => setSelectedSchoolYear(e.target.value)}
            >
              <option value="">Select School Year</option>
              {schoolYears.map((year) => (
                <option key={year.id} value={year.year_name}>
                  {year.year_name}
                </option>
              ))}
            </select>

            <button
              className="bgTheme text-white px-4 py-2 rounded-md font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              onClick={() => {
                setSelectedMonth("");
                setSelectedSchoolYear("");
              }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Error message */}
        {apiError && (
          <div className="border border-red-300 rounded-lg p-4 mb-6 bg-red-50 text-red-700">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {apiError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto no-scrollbar max-h-[70vh] rounded-lg">
          <div className="inline-block min-w-full align-middle rounded-lg">
            <div className="shadow-sm ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bgTheme text-white z-2 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Month
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      School Year
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Base Salary
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Net Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Payment Method
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                      Payment Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {constants.allMonths.map((month) => {
                    const detail = employeeDetailsMap[month];

                    // Apply filters
                    if (
                      (selectedMonth && month !== selectedMonth) ||
                      (selectedSchoolYear &&
                        detail?.school_year_name !== selectedSchoolYear)
                    )
                      return null;

                    // Get payment date from nested payment object
                    const paymentDate =
                      detail?.payment?.payment_date || detail?.created_at || "";

                    return (
                      <tr
                        key={month}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                          {month}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {detail?.school_year_name || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {detail?.gross_amount
                            ? `₹${detail.gross_amount}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {detail?.deductions ? `₹${detail.deductions}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {detail?.net_amount ? `₹${detail.net_amount}` : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 capitalize">
                          {detail?.payment_method || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {paymentDate
                            ? new Date(paymentDate).toLocaleDateString("en-GB")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                          {detail ? (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                detail.payment_status
                              )}`}
                            >
                              {normalizePaymentStatus(detail.payment_status) ||
                                "Unpaid"}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-sm">
                              -
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300 text-center">
                          {!detail || !detail.payment_status ? (
                            <Link
                              to={allRouterLink.paySalaryExpense.replace(
                                ":id",
                                id
                              )}
                              state={{ selectedMonth: month }}
                              className="inline-flex justify-center items-center w-24 px-3 py-1 border border-green-300 rounded-md text-green-700 bg-green-50 hover:bg-green-100 text-sm font-medium text-center"
                            >
                              Pay
                            </Link>
                          ) : (
                            <Link
                              to={allRouterLink.updateSalaryExpense.replace(
                                ":id",
                                id
                              )}
                              state={{
                                selectedMonth: month,
                                salaryId: detail.id, // Pass the salary ID for updating
                              }}
                              className="inline-flex justify-center items-center w-24 px-3 py-1 border border-yellow-300 rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 text-sm font-medium text-center"
                            >
                              Update
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
