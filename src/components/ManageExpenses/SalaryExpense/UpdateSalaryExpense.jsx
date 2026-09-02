import React, { useEffect, useRef, useState } from "react";
import { SuccessModal } from "../../Modals/SuccessModal";
import { Loader } from "../../../global/Loader";
import { fetchSchoolYear } from "../../../services/api/Api";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Error } from "../../../global/Error";
import axios from "axios";
import { constants } from "../../../global/constants";

export const UpdateSalaryExpense = () => {
  const { id } = useParams();
  const role = localStorage.getItem("userRole");
  const authTokens = JSON.parse(localStorage.getItem("authTokens"));
  const access = authTokens.access;
  const modalRef = useRef();
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedMonth = location.state?.selectedMonth || "";
  const [employeeName, setEmployeeName] = useState("");
  const [objId, setObjId] = useState("");
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schoolYears, setSchoolYears] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({
    payment_method: "",
    cheque_number: "",
    school_year_name: "",
  });

  // Define status mapping based on your backend data
  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    // { value: "success", label: "Success" }, // Add this to match your backend
  ];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm();

  const getEmployeeDetails = async () => {
    try {
      setFetching(true);
      const response = await axios.get(
        `${constants.baseUrl}/d/Employee-salary/?user=${id}&month=${preSelectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${access}`,
          },
        }
      );

      if (response.data && response.data.length > 0) {
        const details = response.data[0];

        setEmployeeName(details.employee_name);
        setObjId(details.id);

        // Map payment status correctly - handle case insensitivity
        const backendStatus = details.payment_status?.toLowerCase() || "";
        let mappedStatus = "";

        if (backendStatus === "success" || backendStatus === "paid") {
          mappedStatus = "paid";
        } else if (backendStatus === "pending") {
          mappedStatus = "pending";
        }

        setValue("status", mappedStatus);
        setValue("remarks", details.remarks || "");
        setValue("school_year", details.school_year_name);

        // Payment date mapping
        if (details.payment?.payment_date) {
          setValue("payment_date", details.payment.payment_date.split("T")[0]);
        }

        setPaymentDetails({
          payment_method: details.payment?.payment_method || "",
          cheque_number: details.payment?.cheque_number || "",
          school_year_name: details.school_year_name || "",
        });

        // Set cheque_number value if payment method is Cheque
        if (
          details.payment?.payment_method?.toLowerCase() === "cheque" &&
          details.payment?.cheque_number
        ) {
          setValue("cheque_number", details.payment.cheque_number);
        }
      }
    } catch (error) {
      setError("Failed to load data. Please try again later.");
      console.error("Error fetching employee details:", error);
    } finally {
      setFetching(false);
    }
  };

  const loadSchoolYears = async () => {
    try {
      const data = await fetchSchoolYear();
      setSchoolYears(data);
    } catch (err) {
      console.error("Failed to fetch school years", err);
    }
  };

  useEffect(() => {
    loadSchoolYears();
  }, []);

  useEffect(() => {
    getEmployeeDetails();
  }, [id]);

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);
      setApiError("");

      // Prepare the data for API
      const requestData = {
        ...data,
        // Make sure we're sending the correct field name
        cheque_number: data.cheque_number || null,
      };

      // Remove any undefined or null values
      Object.keys(requestData).forEach((key) => {
        if (requestData[key] === undefined || requestData[key] === null) {
          delete requestData[key];
        }
      });

      const response = await axios.patch(
        `${constants.baseUrl}/d/Employee-salary/${objId}/`,
        requestData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        modalRef.current.show();
        return;
      }
    } catch (error) {
      if (error.response?.data) {
        const errors = error.response.data;

        if (errors.non_field_errors) {
          setApiError(errors.non_field_errors.join(" "));
        } else {
          const fieldErrors = Object.entries(errors)
            .map(([field, messages]) => `${messages.join(", ")}`)
            .join(" | ");
          setApiError(fieldErrors);
        }
      } else {
        setApiError("An unexpected error occurred.");
      }
      console.error("Update error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (fetching) {
    return <Loader />;
  }

  if (error) {
    return <Error />;
  }

  const handleNavigation = (id) => {
    navigate(`/employeeMonthySalary/${id}`);
  };

  // Watch payment status
  const paymentStatus = watch("status");

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 text-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          <i className="fa-solid fa-percentage mr-2"></i>
          Update Paid Salary
        </h1>

        {apiError && (
          <div className="border border-error/50 rounded-lg p-4 mb-6 bg-white dark:bg-gray-800">
            <div className="flex items-center text-error">
              <i className="fa-solid fa-circle-exclamation mr-2"></i>
              <span className="font-medium">{apiError}</span>
            </div>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Employee Name
                </span>
              </label>
              <input
                type="text"
                disabled
                value={employeeName || "N/A"}
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              />
            </div>

            {/* Status */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-circle-check text-sm"></i>
                  Status
                </span>
              </label>
              <select
                disabled={constants.roles.director !== role}
                {...register("status", {
                  required: "Status is required",
                })}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="">Select Status</option>
                {statusOptions.map((option, idx) => (
                  <option key={idx} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.status.message}
                  </span>
                </label>
              )}
            </div>

            {/* Payment Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-calendar-day text-sm"></i>
                  Payment Date <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                {...register("payment_date", {
                  required: "Payment Date is required",
                  validate: (value) => {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    return (
                      selectedDate <= today ||
                      "Payment date cannot be in the future"
                    );
                  },
                })}
              />
              {errors.payment_date && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.payment_date.message}
                  </span>
                </label>
              )}
            </div>

            {/* School Year - Disabled Input Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-school text-sm"></i>
                  School Year
                </span>
              </label>
              <input
                type="text"
                disabled
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                value={paymentDetails.school_year_name || ""}
              />
              <input
                type="hidden"
                {...register("school_year", {
                  required: "School Year is required",
                })}
                value={paymentDetails.school_year_name || ""}
              />
            </div>

            {/* Payment Method - Disabled Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Payment Method
                </span>
              </label>
              <input
                type="text"
                disabled
                className="input input-bordered w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                value={paymentDetails.payment_method || "N/A"}
              />
            </div>

            {/* Cheque Number - Conditionally shown only if payment method is Cheque */}
            {paymentDetails.payment_method?.toLowerCase() === "cheque" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                    <i className="fa-solid fa-file-invoice text-sm"></i>
                    Cheque Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  {...register("cheque_number", {
                    required:
                      paymentDetails.payment_method?.toLowerCase() === "cheque"
                        ? "Cheque number is required for cheque payments"
                        : false,
                  })}
                  placeholder="Enter cheque number"
                />
                {errors.cheque_number && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.cheque_number.message}
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Remarks */}
          <div className="form-control">
            <label className="label">
              <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                <i className="fa-solid fa-align-left text-sm"></i>
                Remarks
              </span>
            </label>
            <textarea
              placeholder="Enter your category description"
              className="textarea textarea-bordered w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              rows={5}
              {...register("remarks")}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="btn bgTheme text-white w-full md:w-40"
            >
              {submitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
              )}
              {submitting ? "" : "Update"}
            </button>
          </div>
        </form>
      </div>
      <SuccessModal
        ref={modalRef}
        navigateTo={() => handleNavigation(id)}
        buttonText="Continue"
        message="Successfully updated!"
      />
    </div>
  );
};
