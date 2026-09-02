import React, { useContext, useEffect, useRef, useState } from "react";
import { fetchSchoolYear } from "../../services/api/Api";
import { constants } from "../../global/constants";
import { allRouterLink } from "../../router/AllRouterLinks";
import { Link } from "react-router-dom";
import { Loader } from "../../global/Loader";
import { Error } from "../../global/Error";
import { SuccessModal } from "../Modals/SuccessModal";
import { ConfirmationModal } from "../Modals/ConfirmationModal";
import { AuthContext } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export const SchoolIncome = () => {
  const { axiosInstance, authTokens } = useContext(AuthContext);
  const navigate = useNavigate();
  const [incomeDetails, setIncomeDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSchoolYear, setSelectedSchoolYear] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState("");

  const modalRef = useRef();
  const confirmModalRef = useRef();
  const [deleteId, setDeleteId] = useState(null);
  const [currentSchoolYearId, setCurrentSchoolYearId] = useState(null);
  const [fileErrorModal, setFileErrorModal] = useState(false);


  // External API
  const getSchoolYear = async () => {
    try {
      const response = await fetchSchoolYear();
      setSchoolYears(response);

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      let currentSchoolYearName =
        currentMonth >= 8
          ? `${currentYear}-${currentYear + 1}`
          : `${currentYear - 1}-${currentYear}`;

      const currentYearObj = response.find(
        (year) => year.year_name === currentSchoolYearName
      );

      if (currentYearObj) {
        setCurrentSchoolYearId(currentYearObj.id);
      } else {
        const currentYearFlag = response.find((year) => year.is_current === true);
        if (currentYearFlag) setCurrentSchoolYearId(currentYearFlag.id);
      }
    } catch (err) {
      console.error("Cannot get the school year:", err);
      setError("Failed to load school years. Please try again later.");
    }
  };

  const handleViewAttachment = (filePath) => {
    if (!filePath) {
      setFileErrorModal(true);
      return;
    }
    window.open(filePath, "_blank");
  };

  // Internal API using axiosInstance
  const getCategories = async () => {
    try {
      const res = await axiosInstance.get("/d/income-category/");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setApiError("Failed to load categories.");
    }
  };

  const getIncomeDetails = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSchoolYear) params.school_year = selectedSchoolYear;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedMonth) params.month = selectedMonth;

      const res = await axiosInstance.get("/d/school-income/", { params });
      setIncomeDetails(res.data);
    } catch (err) {
      console.error(err);
      setApiError("Failed to load income records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getSchoolYear();
    getCategories();
  }, []);

  useEffect(() => {
    getIncomeDetails();
  }, [selectedSchoolYear, selectedCategory, selectedMonth]);

  const handleDeleteIncome = async (id) => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/d/school-income/${id}/`);
      modalRef.current?.show();
      getIncomeDetails();
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      setApiError("Error deleting record");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Error />;

  return (
    <div className="p-6 min-h-screen bg-gray-100 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
            <i className="fa-solid fa-money-bill-wave mr-2"></i> School Income Records
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-4 mb-6 border-b border-gray-300 dark:border-gray-700 pb-2 justify-between">
          {/* Left Filters + Reset Button */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* School Year Filter */}
            <div className="form-control w-48">
              <label className="text-sm font-medium mb-1">
                  Select School Year
              </label>
              <select
                value={selectedSchoolYear}
                onChange={(e) => setSelectedSchoolYear(e.target.value)}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Select School Year</option>
                {schoolYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="form-control w-48">
              <label className="text-sm font-medium mb-1">
                  Select Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Month Filter */}
            <div className="form-control w-48">
              <label className="text-sm font-medium mb-1">
                  Select Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
              >
                <option value="">All Months</option>
                {[
                  "January", "February", "March", "April", "May", "June", "July", "August",
                  "September", "October", "November", "December"
                ].map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            {/*Reset Filter Button */}
            <div className="form-control mt-6 md:mt-0">
              <button
                onClick={() => {
                  setSelectedSchoolYear("");
                  setSelectedCategory("");
                  setSelectedMonth("");
                }}
                className="btn bgTheme text-white"
              >
                Reset Filter
              </button>
            </div>
          </div>

          {/* Create Income Button*/}
          <div className="form-control mt-6 md:mt-0">
            <button
              onClick={() => navigate(allRouterLink.createIncome)}
              className="btn btn-primary bgTheme text-white"
            >
              Create Income
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full overflow-x-auto max-h-[70vh] rounded-lg">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bgTheme text-white sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Month</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-sm  font-semibold text-nowrap">Income Date</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Category</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Description</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">School Year</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Payment Method</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Attachment</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm text-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
              {incomeDetails.length > 0 ? (
                incomeDetails.map((income) => (
                  <tr key={income.id} className="hover:bg-gray-100 text-nowrap dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">{income.month}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">₹{income.amount}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">{income.income_date}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">{income.category_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">{income.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300">{income.school_year}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-nowrap dark:text-gray-300 capitalize">{income.payment_method}</td>

                    <td className="px-4 py-3 text-sm text-blue-600 text-nowrap">
                      {income.attachment ? (
                        <button
                          onClick={() => handleViewAttachment(income.attachment)}
                          className="hover:underline"
                        >
                          View
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <span
                        className={`inline-flex flex-col items-center px-4 py-1 w-20 rounded-full text-xs font-medium text-nowrap capitalize ${income.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                          }`}
                      >
                        {income.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-nowrap text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                      <Link
                        to={allRouterLink.editIncom.replace(":id", income.id)}
                        className="px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteId(income.id);
                          confirmModalRef.current.show();
                        }}
                        className="px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-400 dark:text-gray-600"></i>
                    <p>No income records found for the selected category</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Confirmation Modal */}
        <ConfirmationModal
          ref={confirmModalRef}
          onConfirm={() => handleDeleteIncome(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
        <SuccessModal ref={modalRef} />
      </div>
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
