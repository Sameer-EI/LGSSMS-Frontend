import React, { useContext, useEffect, useRef, useState } from "react";
import {
  fetchExpenseCategory,
  fetchSchoolExpense,
  fetchSchoolYear,
} from "../../../services/api/Api";
import { Loader } from "../../../global/Loader";
import axios from "axios";
import { constants } from "../../../global/constants";
import { Error } from "../../../global/Error";
import { Link, useNavigate } from "react-router-dom";
import { allRouterLink } from "../../../router/AllRouterLinks";
import { SuccessModal } from "../../Modals/SuccessModal";
import { ConfirmationModal } from "../../Modals/ConfirmationModal";
import { AuthContext } from "../../../context/AuthContext";

export const ViewAllExpenses = () => {
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();
  const [schoolExpense, setSchoolExpense] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolYear, setSchoolYear] = useState([]);
  const [category, setCategory] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [error, setError] = useState("");
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategory, setAddCategory] = useState("");
  const [apiError, setApiError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [activeTab, setActiveTab] = useState("Add");
  const modalRef = useRef();
  const confirmModalRef = useRef();
  const [deleteId, setDeleteId] = useState(null);
  const [currentSchoolYearId, setCurrentSchoolYearId] = useState(null);
  const [fileErrorModal, setFileErrorModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getSchoolYear = async () => {
    try {
      setError("");
      const response = await fetchSchoolYear();
      setSchoolYear(response);

      // Get current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      let currentSchoolYearName;

      if (currentMonth >= 8) {
        currentSchoolYearName = `${currentYear}-${currentYear + 1}`;
      } else {
        currentSchoolYearName = `${currentYear - 1}-${currentYear}`;
      }

      const currentYearObj = response.find(
        (year) => year.year_name === currentSchoolYearName
      );

      if (currentYearObj) {
        setCurrentSchoolYearId(currentYearObj.id);
      } else {
        const currentYear = response.find((year) => year.is_current === true);
        if (currentYear) {
          setCurrentSchoolYearId(currentYear.id);
        }
      }
    } catch (err) {
      console.error("Cannot get the school year:", err);
      setError("Failed to load school years. Please try again later.");
    }
  };

  const getExpenseCategory = async () => {
    try {
      setError("");
      const response = await axiosInstance.get(`/d/Expense-Category/`);
      setCategory(response.data);
    } catch (err) {
      setError("Failed to load categories. Please try again later.");
    }
  };

  // const getSchoolExpense = async () => {
  //   setLoading(true);
  //   try {
  //     setError("");
  //     const response = await axiosInstance.get(
  //       `/d/School-Expense/?school_year=${selectedSchoolYear}&category=${selectedCategory}`
  //     );

  //     // Map the data to match component's expected structure
  //     const mappedData = response.data.map((expense) => {
  //       let amount = "0.00";
  //       let status = expense.approved_by ? "approved" : "pending";
  //       let payment_method = "N/A";
  //       let expense_date = new Date(expense.created_at).toLocaleDateString("en-IN");

  //       // Extract month from description for salary expenses
  //       let expenseMonthYear = null;

  //       // For salary expenses (category is 6 and payment is null)
  //       if (expense.category === 6 && !expense.payment) {
  //         // Parse amount from description for salary
  //         const totalSalaryMatch = expense.description.match(
  //           /Total Salary: ₹([\d,.]+)/
  //         );
  //         if (totalSalaryMatch) {
  //           amount = totalSalaryMatch[1];
  //         }

  //         // Extract month from description for salary
  //         const monthMatch = expense.description.match(/for\s+(\w+)/i);
  //         if (monthMatch) {
  //           const monthName = monthMatch[1];
  //           // Try to get year from school year name or current year
  //           const currentYear = new Date().getFullYear();
  //           const yearFromSchoolYear = expense.school_year_name
  //             ? expense.school_year_name.split('-')[0]
  //             : currentYear;

  //           // Create date from month name and year
  //           try {
  //             const date = new Date(`${monthName} 1, ${yearFromSchoolYear}`);
  //             if (!isNaN(date.getTime())) {
  //               expense_date = date.toLocaleDateString("en-IN");
  //             }
  //           } catch (e) {
  //             console.warn("Could not parse date from month name:", monthName);
  //           }
  //         }

  //         payment_method = "Cash"; // Default for salary
  //         status = expense.approved_by ? "approved" : "pending";
  //       }

  //       // For expenses with payment object
  //       if (expense.payment) {
  //         amount = expense.payment.amount;
  //         status = expense.payment.status.toLowerCase();
  //         payment_method = expense.payment.payment_method;

  //         // Use payment_date if available, otherwise use created_at
  //         if (expense.payment.payment_date) {
  //           expense_date = new Date(expense.payment.payment_date).toLocaleDateString("en-IN");
  //         }
  //       }

  //       return {
  //         ...expense,
  //         amount: amount,
  //         status: status,
  //         payment_method: payment_method,
  //         expense_date: expense_date,
  //         attachment: null,
  //       };
  //     });

  //     setSchoolExpense(mappedData);
  //   } catch (err) {
  //     console.error("Cannot get the school expense:", err);
  //     setError("Failed to load expenses. Please try again later.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getSchoolExpense = async () => {
    setLoading(true);
    try {
      setError("");
      const response = await axiosInstance.get(
        `/d/School-Expense/?school_year=${selectedSchoolYear}&category=${selectedCategory}`
      );

      // Map the data to match component's expected structure
      const mappedData = response.data.map((expense) => {
        let amount = "0.00";
        let status = expense.approved_by ? "approved" : "pending";
        let payment_method = "N/A";
        let expense_date = new Date(expense.created_at).toLocaleDateString(
          "en-IN"
        );

        // Extract month from description for salary expenses
        let expenseMonthYear = null;

        // For salary expenses (category is 6 and payment is null)
        if (expense.category === 6 && !expense.payment) {
          // Parse amount from description for salary
          const totalSalaryMatch = expense.description.match(
            /Total Salary: ₹([\d,.]+)/
          );
          if (totalSalaryMatch) {
            amount = totalSalaryMatch[1];
          }

          // Check if amount is 0 and show N/A
          if (
            amount === "0.00" ||
            amount === "0" ||
            parseFloat(amount.replace(/,/g, "")) === 0
          ) {
            amount = "N/A";
          }

          // Extract month from description for salary
          const monthMatch = expense.description.match(/for\s+(\w+)/i);
          if (monthMatch) {
            const monthName = monthMatch[1];
            // Try to get year from school year name or current year
            const currentYear = new Date().getFullYear();
            const yearFromSchoolYear = expense.school_year_name
              ? expense.school_year_name.split("-")[0]
              : currentYear;

            // Create date from month name and year
            try {
              const date = new Date(`${monthName} 1, ${yearFromSchoolYear}`);
              if (!isNaN(date.getTime())) {
                expense_date = date.toLocaleDateString("en-IN");
              }
            } catch (e) {
              console.warn("Could not parse date from month name:", monthName);
            }
          }

          payment_method = "Cash"; // Default for salary
          status = expense.approved_by ? "approved" : "pending";
        }

        // For expenses with payment object
        if (expense.payment) {
          amount = expense.payment.amount;

          // Check if amount is 0 and show N/A (for non-salary expenses too)
          if (amount === "0.00" || amount === "0" || parseFloat(amount) === 0) {
            amount = "N/A";
          }

          status = expense.payment.status.toLowerCase();
          payment_method = expense.payment.payment_method;

          // Use payment_date if available, otherwise use created_at
          if (expense.payment.payment_date) {
            expense_date = new Date(
              expense.payment.payment_date
            ).toLocaleDateString("en-IN");
          }
        }

        return {
          ...expense,
          amount: amount,
          status: status,
          payment_method: payment_method,
          expense_date: expense_date,
          attachment: null,
        };
      });

      setSchoolExpense(mappedData);
    } catch (err) {
      console.error("Cannot get the school expense:", err);
      setError("Failed to load expenses. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSchoolYear();
    getExpenseCategory();
  }, []);

  useEffect(() => {
    getSchoolExpense();
  }, [selectedSchoolYear, selectedCategory]);

  const filteredExpenses = schoolExpense.filter((expense) => {
    // Status filter - use the mapped status
    const statusMatch =
      !selectedStatus ||
      expense.status.toLowerCase() === selectedStatus.toLowerCase();

    // Search filter across description, category, created_by_name
    const searchMatch = searchQuery
      ? expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        expense.created_by_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : true;

    return statusMatch && searchMatch;
  });

  const handleAddCategoryClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveTab("Add");
    setShowAddCategoryModal(true);
  };

  const closeModal = () => {
    setShowAddCategoryModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!addCategory.trim()) {
      setApiError("Category name is required");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post(`/d/Expense-Category/`, {
        name: addCategory,
      });

      if (response.status === 201 || response.status === 200) {
        setAddCategory("");
        setApiError("");
        closeModal();
        getExpenseCategory();
      }
    } catch (error) {
      console.error(error);
      setApiError(error.response?.data?.detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      setLoading(true);
      const response = await axiosInstance.delete(`/d/School-Expense/${id}/`);
      if (response.status === 200 || response.status === 204) {
        modalRef.current?.show();
        getSchoolExpense();
        setDeleteId(null);
      }
    } catch (error) {
      setApiError(
        error?.response?.data?.detail ||
          error?.message ||
          "Error deleting expense"
      );
    } finally {
      setLoading(false);
    }
  };

  // Attachment handler
  const handleViewAttachment = async (filePath) => {
    if (!filePath) {
      setFileErrorModal(true);
      return;
    }

    try {
      const fullPath = filePath.replace(
        "http://localhost:8000",
        constants.baseUrl
      );

      // Try direct open
      const newWindow = window.open(fullPath, "_blank");
      if (newWindow) return;

      // Fallback with auth
      const response = await axiosInstance.get(fullPath, {
        responseType: "blob",
      });
      const fileURL = URL.createObjectURL(response.data);
      window.open(fileURL, "_blank");
    } catch (error) {
      console.error("File fetch error:", error);
      setFileErrorModal(true);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
  }

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center mb-4">
            <i className="fa-solid fa-money-bill-wave mr-2"></i> Total Expenses
          </h1>
        </div>

        {/* Display API error */}
        {apiError && (
          <div className="border border-error/50 rounded-lg p-4 mb-6 bg-white dark:bg-gray-700">
            <div className="flex items-center text-error">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              <span className="font-medium">{apiError}</span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-6 border-b pb-2 dark:border-gray-700 w-full">
          {/* Left side filters + reset */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap md:gap-2 items-end gap-2 w-full md:w-auto">
            {/* School Year Filter */}
            <div className="form-control w-full sm:w-40">
              <label className="text-sm font-medium mb-1">
                Search by School Year
              </label>
              <select
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Year</option>
                {schoolYear.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="form-control w-full sm:w-40">
              <label className="text-sm font-medium mb-1">
                Search by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Categories</option>
                {category.map((cate) => (
                  <option key={cate.id} value={cate.id}>
                    {cate.name.charAt(0).toUpperCase() + cate.name.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="form-control w-full sm:w-32">
              <label className="text-sm font-medium mb-1">
                Search by Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Reset Button (stays on left) */}
            <button
              className="btn bgTheme text-white w-full sm:w-auto mt-2 sm:mt-0"
              onClick={() => {
                setSelectedSchoolYear("");
                setSelectedCategory("");
                setSelectedStatus("");
                setSearchQuery("");
              }}
            >
              Reset
            </button>
          </div>

          {/* Right side Search + Create button */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-2 w-full md:w-auto justify-end mt-2 md:mt-0">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full sm:w-48 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            <button
              className="btn bgTheme text-white w-full sm:w-auto mt-2 sm:mt-0"
              onClick={() => navigate(allRouterLink.createExpenses)}
            >
              <i className="fa-solid fa-receipt ml-2"></i> Create Expense
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto max-h-[70vh] rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bgTheme text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Payment Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Payment Method
                </th>
                {/* <th className="px-8 py-3 text-left text-sm font-semibold text-nowrap">Attachment</th> */}
                <th className="px-8 py-3 text-left text-sm font-semibold text-nowrap">
                  Status
                </th>
                <th className="px-18 py-3 text-left text-sm font-semibold text-nowrap">
                  Created At
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Created By
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap">
                  Approved By
                </th>
                <th className="px-12 py-3 text-left text-sm font-semibold text-nowrap">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                      {expense.category_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                      {expense.amount === "N/A" ||
                      expense.amount === "0.00" ||
                      expense.amount === "0"
                        ? "N/A"
                        : `₹${expense.amount}`}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-200"
                      title={expense.description}
                    >
                      {expense.description}
                    </td>
                    <td className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-200">
                      {expense.expense_date}
                    </td>
                    <td className="px-10 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-200 capitalize">
                      {expense.payment_method}
                    </td>
                    {/* <td className="px-4 py-3 text-sm text-nowrap truncate max-w-xs">
                      {expense.attachment ? (
                        <button
                          onClick={() => handleViewAttachment(expense.attachment)}
                          className="textTheme underline"
                        >
                          Open Attachment
                        </button>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">
                          No Attachment
                        </span>
                      )}
                    </td> */}
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize ${
                          expense.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : expense.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-200 text-center">
                      {new Date(expense.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                      {expense.created_by_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 text-nowrap">
                      {expense.approved_by_name || "Not Approved"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm w-56">
                      <div className="flex space-x-2">
                        {expense.school_year === currentSchoolYearId ? (
                          <Link
                            to={allRouterLink.editExpenses.replace(
                              ":id",
                              expense.id
                            )}
                            className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                          >
                            Edit
                          </Link>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
                          >
                            Edit
                          </button>
                        )}

                        {expense.school_year === currentSchoolYearId ? (
                          <button
                            onClick={() => {
                              setDeleteId(expense.id);
                              confirmModalRef.current.show();
                            }}
                            className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        ) : (
                          <button
                            disabled
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="11"
                    className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-400"></i>
                    <p>No expenses found for the selected criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SuccessModal ref={modalRef} />
      <ConfirmationModal
        ref={confirmModalRef}
        onConfirm={() => handleDeleteExpense(deleteId)}
        onCancel={() => setDeleteId(null)}
      />

      {/* Error Modal */}
      {fileErrorModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-opacity-50 z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded shadow-lg text-center">
            <h2 className="text-lg font-bold mb-4">File Not Found</h2>
            <p className="mb-4">Sorry, this attachment is not available.</p>
            <button
              className="btn bgTheme text-white"
              onClick={() => setFileErrorModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
