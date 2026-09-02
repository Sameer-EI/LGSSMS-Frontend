import React, { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { allRouterLink } from "../../../router/AllRouterLinks";
import { constants } from "../../../global/constants";
import { ConfirmationModal } from "../../Modals/ConfirmationModal";
import { Loader } from "../../../global/Loader";
import { Error } from "../../../global/Error";
import { AuthContext } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export const ViewSalaryExpense = () => {
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();
  const [schoolExpense, setSchoolExpense] = useState([]);

  const userRole = localStorage.getItem("userRole");

  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [searchName, setSearchName] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const modalRef = useRef();

  const getSchoolExpense = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/d/Employee/");
      setSchoolExpense(response.data);
    } catch (error) {
      console.log("Failed to get the school salary expense", error.message);
      setError("Failed to get the school salary expense");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const response = await axiosInstance.delete(`/d/Employee/${selectedId}/`);
      if (response.status === 200 || response.status === 204) {
        setSchoolExpense((prev) =>
          prev.filter((expense) => expense.id !== selectedId)
        );
        setSelectedId(null);
      }
    } catch (err) {
      if (err.response?.data) {
        setApiError(err.response.data.error || err.response.data.detail);
      } else {
        setApiError("Something went wrong. Try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    modalRef.current.show();
  };

  useEffect(() => {
    getSchoolExpense();
  }, []);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
  }

  //  filter 
  const filteredExpenses = schoolExpense
    .filter((expense) => {
      const matchesName = expense.name
        ?.toLowerCase()
        .includes(searchName.toLowerCase());

      const matchesRole = roleFilter
        ? Array.isArray(expense.role)
          ? expense.role.some(
            (r) => r.toLowerCase() === roleFilter.toLowerCase()
          )
          : expense.role?.toLowerCase() === roleFilter.toLowerCase()
        : true;


      return matchesName && matchesRole;
    })
    .sort((a, b) => a.name.localeCompare(b.name));


  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <div className="mb-4 border-b border-gray-300 dark:border-gray-700">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-4">
            <i className="fa-solid fa-wallet mr-2"></i> Salary
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-between py-2 sm:items-center">
            {/* Left side: Dropdown + Reset */}
            <div className="flex items-center gap-1.5">
              <select
                className="select select-bordered w-full sm:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="teacher">Teacher</option>
                <option value="office staff">Office Staff</option>
              </select>

              <button
                className="btn bgTheme text-white w-24"
                onClick={() => { setRoleFilter(""); setSearchName(""); }}
              >
                Reset
              </button>
            </div>

            {/* Right side: Search + Create Salary */}
            <div className="flex flex-row gap-2 sm:ml-auto">
              <input
                type="text"
                placeholder="Search Employee Name..."
                className="border px-3 py-2 rounded w-full sm:w-64 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value.trimStart())}
              />

              <button
                onClick={() => navigate(allRouterLink.createSalaryExpense)}
                className="btn bgTheme text-white"
              >
                <i className="fa-solid fa-plus mr-2"></i>
                Create Salary
              </button>
            </div>
          </div>

        </div>

        {/* Display API error message */}
        {apiError && (
          <div className="border border-error/50 rounded-lg p-4 mb-6 bg-white dark:bg-red-900">
            <div className="flex items-center text-error dark:text-red-400">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              <span className="font-medium">{apiError}</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="w-full overflow-x-auto no-scrollbar rounded-lg max-h-[70vh]">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bgTheme text-white z-2 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap whitespace-nowrap">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap whitespace-nowrap">
                  Role
                </th>
                {/* <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap whitespace-nowrap">
                  Joining Date
                </th> */}
                <th className="px-4 py-3 text-left text-sm font-semibold text-nowrap whitespace-nowrap">
                  Base Salary
                </th>
                {/* Only show Actions column if userRole is NOT officeStaff */}
                {userRole !== constants.roles.officeStaff && (
                  <th className="px-20 py-3 text-left text-sm font-semibold text-nowrap whitespace-nowrap" width={10}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {filteredExpenses.length > 0 ? (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-300 whitespace-nowrap capitalize">
                      {expense.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-300 whitespace-nowrap capitalize">
                      {(typeof expense.role === "string" ? [expense.role] : expense.role)
                        .map((r) => r)
                        .join(", ")}
                    </td>
                    {/* <td className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {expense.joining_date}
                    </td> */}
                    <td className="px-4 py-3 text-sm text-nowrap text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      ₹{expense.base_salary}
                    </td>
                    {/* Only show Actions buttons if userRole is NOT officeStaff */}
                    {userRole !== constants.roles.officeStaff && (
                      <td className="whitespace-nowrap text-nowrap px-4 py-3 text-sm w-56">
                        <div className="flex space-x-2">
                          {constants.roles.director === userRole && (
                            <>
                              <Link
                                to={allRouterLink.editSalaryExpense.replace(":id", expense.id)}
                                className="inline-flex items-center px-3 py-1 border border-yellow-300 rounded-md shadow-sm text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                              >
                                Edit
                              </Link>

                              <button
                                onClick={() => handleDeleteClick(expense.id)}
                                className="inline-flex items-center px-3 py-1 shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-md"
                              >
                                Delete
                              </button>

                              <Link
                                to={allRouterLink.employeeMonthySalary.replace(":id", expense.id)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
                              >
                                Details
                              </Link>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={userRole !== constants.roles.officeStaff ? 10 : 9} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <i className="fa-solid fa-inbox text-4xl mb-2 text-gray-400 dark:text-gray-600"></i>
                      <p>No Salary Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


        <ConfirmationModal
          ref={modalRef}
          onConfirm={confirmDelete}
          onCancel={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
};
