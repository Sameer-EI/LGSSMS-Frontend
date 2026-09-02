import React, { useContext, useEffect, useRef, useState } from "react";
import { SuccessModal } from "../../Modals/SuccessModal";
import { AuthContext } from "../../../context/AuthContext";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { constants } from "../../../global/constants";
import { Error } from "../../../global/Error";
import { allRouterLink } from "../../../router/AllRouterLinks";

export const EditExpenses = () => {
  const userRole = localStorage.getItem("userRole");
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [category, setCategory] = useState([]);
  const [apiError, setApiError] = useState("");
  const [error, setError] = useState("");
  const [expenseData, setExpenseData] = useState(null);
  const modalRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState(null);
  const [isSalaryCategory, setIsSalaryCategory] = useState(false);
  const [isChequeCategory, setIsChequeCategory] = useState(false);

  // Add state for alert modal (same as UploadExamPaper)
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const { axiosInstance } = useContext(AuthContext);

  const Status = ["approved", "pending", "rejected"];
  const PaymentMethods = ["Cash", "Cheque", "Bank Transfer", "Online"];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

const getSchoolExpenseById = async () => {
  try {
    setError("");
    const response = await axiosInstance.get(`/d/School-Expense/${id}/`);
    const data = response.data;
    setExpenseData(data);

    if (data) {
      // Check if category is salary (case-insensitive)
      const categoryName = data.category_name || "";
      const isSalary = categoryName.toLowerCase() === "salary";
      setIsSalaryCategory(isSalary);
      
      // Check if payment_method exists and is cheque
      const paymentMethod = data.payment?.payment_method || "";
      const isCheque = paymentMethod.toLowerCase() === "cheque";
      setIsChequeCategory(isCheque);
      
      // Map the data to form fields
      setValue("category", data.category);

      if (!isSalary) {
        // Only set these values for non-salary categories
        setValue("amount", data.payment?.amount || "");
        setValue("description", data.description || "");

        // Format date for input[type="date"]
        const paymentDate = data.payment?.payment_date;
        if (paymentDate) {
          const dateObj = new Date(paymentDate);
          const formattedDate = dateObj.toISOString().split("T")[0];
          setValue("payment_date", formattedDate);
        } else {
          // Use created_at as fallback
          const createdDate = new Date(data.created_at);
          setValue("payment_date", createdDate.toISOString().split("T")[0]);
        }

        // Set status - convert to lowercase
        const status = data.payment?.status;
        if (status) {
          setValue("status", status.toLowerCase());
        }

        // Set payment method if exists
        if (data.payment?.payment_method) {
          setValue("payment_method", data.payment.payment_method);
        }

        // Set cheque number if exists (important for cheque category)
        if (data.payment?.cheque_number) {
          setValue("cheque_number", data.payment.cheque_number);
        }

        // Set school year if exists
        if (data.school_year) {
          setValue("school_year", data.school_year);
        }
      } else {
        // For salary category, still set school year
        if (data.school_year) {
          setValue("school_year", data.school_year);
        }
        if (data.description) {
          setValue("description", data.description);
        }
      }

      // Set approved_by if exists (for both salary and non-salary)
      if (data.approved_by_name) {
        setValue("approved_by_display", data.approved_by_name);
      }

      // Handle existing attachment
      if (data.attachment) {
        setExistingAttachment(data.attachment);
      }
    }
  } catch (err) {
    console.error("Error loading expense:", err);
    setError("Failed to load expenses. Please try again later.");
  } finally {
    setIsLoading(false);
  }
};

  const getExpenseCategory = async () => {
    try {
      setError("");
      const response = await axiosInstance.get("/d/Expense-Category/");
      setCategory(response.data);
    } catch (err) {
      console.error("Cannot get the category:", err);
      setError("Failed to load categories. Please try again later.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([getExpenseCategory(), getSchoolExpenseById()]);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setApiError("");
      setShowAlert(false);

      let formData;

      if (isSalaryCategory) {
        // Send empty PATCH request for salary categories
        formData = new FormData();
      } else {
        // Original logic for non-salary categories
        formData = new FormData();

        // Append all text fields
        formData.append("category", data.category);
        formData.append("amount", data.amount);
        formData.append("description", data.description || "");
        formData.append("payment_date", data.payment_date); // Changed from expense_date to payment_date

        // Only append status if it exists (for directors)
        if (data.status && constants.roles.director === userRole) {
          formData.append("status", data.status);
        }

        // Append payment related fields if they exist in your API
        if (data.payment_method) {
          formData.append("payment_method", data.payment_method);
        }

        if (data.cheque_number) {
          formData.append("cheque_number", data.cheque_number);
        }

        // Append cheque-related fields if they exist and category is cheque
        if (isChequeCategory) {
          if (data.cheque_date) {
            formData.append("cheque_date", data.cheque_date);
          }
          if (data.bank_name) {
            formData.append("bank_name", data.bank_name);
          }
          if (data.account_number) {
            formData.append("account_number", data.account_number);
          }
        }

        if (data.school_year) {
          formData.append("school_year", data.school_year);
        }

        // Append file if selected (replaces existing)
        if (selectedFile) {
          formData.append("attachment", selectedFile);
        } else if (data.remove_attachment === "true") {
          formData.append("attachment", "");
        }
      }

      const response = await axiosInstance.patch(
        `/d/School-Expense/${id}/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        setAlertMessage(
          isSalaryCategory
            ? "Expense update request sent!"
            : "Expense has been updated successfully!"
        );
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Edit expense error:", error);
      let backendMsg = "Something went wrong";

      if (error.response?.data) {
        const errData = error.response.data;

        if (typeof errData === "object") {
          if (errData.error) {
            backendMsg = errData.error;
          } else {
            backendMsg = Object.values(errData)
              .map((val) => (Array.isArray(val) ? val.join(", ") : val))
              .join("\n");
          }
        } else if (typeof errData === "string") {
          backendMsg = errData;
        }
      } else if (error.message) {
        backendMsg = error.message;
      }

      setAlertMessage(backendMsg);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading && !apiError) {
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
    return <Error />;
  }

  const handleNavigation = () => {
    navigate(`${allRouterLink.viewAllExpenses}`);
  };

  const handleRemoveExistingAttachment = () => {
    setExistingAttachment(null);
    setValue("remove_attachment", "true");
  };

  const getCategoryName = (categoryId) => {
    const foundCategory = category.find((cat) => cat.id === categoryId);
    return foundCategory
      ? foundCategory.name.charAt(0).toUpperCase() + foundCategory.name.slice(1)
      : "";
  };

  const formatStatus = (status) => {
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          Edit Expense
          <i className="fa-solid fa-pen-to-square ml-2"></i>
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {isSalaryCategory ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-list text-sm"></i>
                      Category <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={expenseData?.category_name || ""}
                    disabled
                    readOnly
                  />
                  <input
                    type="hidden"
                    {...register("category", {
                      required: "Category is required",
                    })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-calendar text-sm"></i>
                      School Year
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={expenseData?.school_year_name || ""}
                    disabled
                    readOnly
                  />
                  <input type="hidden" {...register("school_year")} />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-1">
                    <i className="fa-solid fa-file-lines text-sm"></i>
                    Description
                  </span>
                </label>
                <textarea
                  placeholder="Enter expense description"
                  className="textarea textarea-bordered w-full focus:outline-none bg-gray-100"
                  rows={4}
                  value={expenseData?.description || ""}
                  disabled
                  readOnly
                />
                <input type="hidden" {...register("description")} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-list text-sm"></i>
                      Category <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={
                      expenseData?.category_name ||
                      (expenseData ? getCategoryName(expenseData.category) : "")
                    }
                    disabled
                    readOnly
                  />
                  <input
                    type="hidden"
                    {...register("category", {
                      required: "Category is required",
                    })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-calendar text-sm"></i>
                      School Year
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={expenseData?.school_year_name || ""}
                    disabled
                    readOnly
                  />
                  <input type="hidden" {...register("school_year")} />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-money-bill-wave text-sm"></i>
                      Amount <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled
                    placeholder="Enter Base Salary e.g: 15000"
                    className="input input-bordered w-full focus:outline-none"
                    {...register("amount", {
                      required: "Amount salary is required",
                      min: { value: 0, message: "Salary must be positive" },
                    })}
                  />
                </div>

                {/* Payment Date Field - Changed from Expense Date */}
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-calendar-days text-sm"></i>
                      Payment Date <span className="text-error">*</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    disabled
                    className="input input-bordered w-full focus:outline-none"
                    {...register("payment_date", {
                      required: "Payment Date is required",
                    })}
                  />
                  {errors.payment_date && (
                    <span className="text-error text-sm mt-1">
                      {errors.payment_date.message}
                    </span>
                  )}
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-circle-check text-sm"></i>
                      Status
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={
                      expenseData?.payment?.status
                        ? formatStatus(expenseData.payment.status)
                        : ""
                    }
                    disabled
                    readOnly
                  />
                  <input type="hidden" {...register("status")} />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-credit-card text-sm"></i>
                      Payment Method
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={expenseData?.payment?.payment_method || ""}
                    disabled
                    readOnly
                  />
                  <input type="hidden" {...register("payment_method")} />
                </div>

                {isChequeCategory && (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text flex items-center gap-1">
                        <i className="fa-solid fa-hashtag text-sm"></i>
                        Cheque Number <span className="text-error">*</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter cheque number"
                      className="input input-bordered w-full focus:outline-none"
                      {...register("cheque_number", {
                        required: isChequeCategory ? "Cheque number is required for cheque category" : false,
                      })}
                    />
                    {errors.cheque_number && (
                      <span className="text-error text-sm mt-1">
                        {errors.cheque_number.message}
                      </span>
                    )}
                  </div>
                )}

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-user-check text-sm"></i>
                      Approved By
                    </span>
                  </label>
                  <input
                    type="text"
                    className="input input-bordered w-full focus:outline-none bg-gray-100"
                    value={expenseData?.approved_by_name || "Not approved yet"}
                    disabled
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <i className="fa-solid fa-file-lines text-sm"></i>
                      Description
                    </span>
                  </label>
                  <textarea
                    placeholder="Enter expense description"
                    className="textarea textarea-bordered w-full focus:outline-none"
                    rows={4}
                    {...register("description")}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col md:flex-row justify-center pt-6 gap-4">
            <button
              type="submit"
              className="btn bgTheme text-white w-full md:w-40 text-nowrap"
              disabled={loading}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk mr-2"></i>
                  Update Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <SuccessModal
        ref={modalRef}
        navigateTo={handleNavigation}
        buttonText="Continue"
        message={
          isSalaryCategory
            ? "Expense update request sent!"
            : "Expense has been updated successfully!"
        }
      />

      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">Edit Expense</h3>
            <p className="py-4">
              {alertMessage.split("\n").map((line, idx) => (
                <span key={idx}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
                onClick={() => setShowAlert(false)}
              >
                OK
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};