import React, { useContext, useEffect, useRef, useState } from "react";
import { SuccessModal } from "../../Modals/SuccessModal";
import { useForm } from "react-hook-form";
import { AuthContext } from "../../../context/AuthContext";
import { fetchSchoolYear } from "../../../services/api/Api";
import { constants } from "../../../global/constants";
import { allRouterLink } from "../../../router/AllRouterLinks";
import { useNavigate } from "react-router-dom";

export const CreateExpenses = () => {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState([]);
  const [apiError, setApiError] = useState("");
  const [error, setError] = useState("");
  const [schoolYear, setSchoolYear] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [isSalaryCategory, setIsSalaryCategory] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [isChequePayment, setIsChequePayment] = useState(false);
  
  const modalRef = useRef();
  const { axiosInstance } = useContext(AuthContext);
  const navigate = useNavigate();
  const paymentModes = ["Cash", "Cheque", "Online"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  // Watch the category field
  const watchedCategory = watch("category");
  // Watch the payment method field
  const watchedPaymentMethod = watch("payment_method");

  // Update isSalaryCategory when category changes
  useEffect(() => {
    if (watchedCategory && category.length > 0) {
      // Find the selected category object
      const selectedCat = category.find(cat => cat.id === parseInt(watchedCategory));
      
      if (selectedCat) {
        setSelectedCategoryName(selectedCat.name);
        // Check if category name is exactly "Salary"
        const isSalary = selectedCat.name.trim().toLowerCase() === "salary";
        setIsSalaryCategory(isSalary);
      } else {
        setSelectedCategoryName("");
        setIsSalaryCategory(false);
      }
    } else {
      setSelectedCategoryName("");
      setIsSalaryCategory(false);
    }
  }, [watchedCategory, category]);

  // Update isChequePayment when payment method changes
  useEffect(() => {
    if (watchedPaymentMethod) {
      setIsChequePayment(watchedPaymentMethod === "Cheque");
    } else {
      setIsChequePayment(false);
    }
  }, [watchedPaymentMethod]);

  const getExpenseCategory = async () => {
    try {
      setError("");
      const response = await axiosInstance.get("/d/Expense-Category/");
      const sortedCategory = (response.data || []).sort((a, b) =>
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );
      setCategory(sortedCategory);
    } catch (err) {
      console.error("Cannot get the category:", err);
      setError("Failed to load categories. Please try again later.");
      setModalMessage("Failed to load categories. Please try again later.");
      setShowModal(true);
    }
  };

  const getSchoolYearLevel = async () => {
    try {
      const response = await fetchSchoolYear();
      setSchoolYear(response);
    } catch (error) {
      setError(error);
      setModalMessage("Failed to load School Year Level.");
      setShowModal(true);
    }
  };

  useEffect(() => {
    getSchoolYearLevel();
    getExpenseCategory();
  }, []);

  const onSubmit = async (data) => {   
    try {
      setLoading(true);
      setApiError("");

      let payload;

      if (isSalaryCategory) {
        // For Salary category
        payload = {
          school_year: parseInt(data.school_year),
          category: parseInt(data.category),
          month: data.month
        };
      } else {
        // For non-salary categories
        const paymentPayload = {
          amount: parseFloat(data.amount).toString(),
          payment_method: data.payment_method, // Keep original case (Cash, Cheque, Online)
          payment_date: `${data.expense_date}T10:00:00` // Add time component
        };

        // Add remarks if description exists
        if (data.description && data.description.trim() !== "") {
          paymentPayload.remarks = data.description;
        }

        // Add cheque number if payment method is cheque
        if (data.payment_method === "Cheque" && data.cheque_number) {
          paymentPayload.cheque_number = data.cheque_number;
        }

        payload = {
          school_year: parseInt(data.school_year),
          category: parseInt(data.category),
          description: data.description || "",
          payment: paymentPayload
        };
      }


      // Handle online payment logic (only for non-salary)
      if (!isSalaryCategory && data.payment_method === "Online") {
        const formData = new FormData();
        formData.append("data", JSON.stringify(payload));
        
        const orderResponse = await axiosInstance.post(
          `/d/School-Expense/initiate-expense-payment/`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        const {
          id: order_id,
          amount,
          currency,
          expense_id,
          razorpay_key,
          razorpay_order_id,
        } = orderResponse.data;

        const options = {
          key: razorpay_key,
          amount: amount * 100,
          currency,
          name: "School Expense",
          description: data.description,
          order_id: razorpay_order_id,
          handler: async function (response) {
            await axiosInstance.post(
              `/d/School-Expense/confirm-expense-payment/`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                expense_id: expense_id,
              }
            );
            modalRef.current?.show();
          },
          prefill: {
            name: data.name || "Test User",
            email: data.email || "test@example.com",
            contact: data.contact || "9876543210",
          },
          theme: { color: constants.bgTheme },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const response = await axiosInstance.post(
          `/d/School-Expense/`,
          payload,
          { headers: { "Content-Type": "application/json" } }
        );
        console.log("Response:", response);
        if (response.status === 200 || response.status === 201)
          modalRef.current?.show();
      }
    } catch (error) {
      console.error("Error details:", error);
      if (error.response?.data) {
        const errors = error.response.data;
        console.log("Error response:", errors);

        if (errors.non_field_errors) {
          const message = errors.non_field_errors.join(" ");
          setApiError(message);
          setModalMessage(message);
          setShowModal(true);
        } else if (errors.payment) {
          // Handle nested payment errors
          const paymentErrors = errors.payment;
          const errorMessages = Object.entries(paymentErrors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
          setApiError(errorMessages);
          setModalMessage(errorMessages);
          setShowModal(true);
        } else {
          const fieldErrors = Object.entries(errors)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`)
            .join(" | ");
          setApiError(fieldErrors);
          setModalMessage(fieldErrors);
          setShowModal(true);
        }
      } else if (error.request) {
        setApiError(
          "Server not responding. Please check your internet connection or try again later."
        );
        setModalMessage(
          "The server did not respond. Please check your internet connection and try again. If the issue continues, contact the administrator."
        );
        setShowModal(true);
      } else {
        setApiError(
          "Something went wrong while processing your request. Please refresh the page or contact support."
        );
        setModalMessage(
          "An unexpected issue occurred while submitting your expense. Please refresh the page and try again. If the problem persists, contact the administrator for assistance."
        );
        setShowModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = () => navigate(`${allRouterLink.viewAllExpenses}`);

  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 dark:bg-gray-800 dark:text-white rounded-box my-5 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          Create Expense <i className="fa-solid fa-receipt ml-2"></i>
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* School Year - Always shown */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <i className="fa-solid fa-calendar-days text-sm"></i>
                School Year <span className="text-error">*</span>
              </label>
              <select
                disabled={loading}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                {...register("school_year", { required: "School Year is required" })}
              >
                <option value="">Select School Year</option>
                {schoolYear
                  ?.filter((year) => {
                    const today = new Date();
                    const start = new Date(year.start_date);
                    const end = new Date(year.end_date);
                    return today >= start && today <= end;
                  })
                  .map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.year_name}
                    </option>
                  ))}
              </select>

              {errors.school_year && (
                <p className="text-error text-sm mt-1">
                  {errors.school_year.message}
                </p>
              )}
            </div>

            {/* Category - Always shown */}
            <div className="form-control">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <i className="fa-solid fa-tags text-sm"></i>
                Category <span className="text-error">*</span>
              </label>
              <select
                disabled={loading}
                className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white capitalize"
                {...register("category", { required: "Category is required" })}
              >
                <option value="">Select Category</option>
                {category?.map((cat) => cat && (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-error text-sm mt-1">{errors.category.message}</p>}
            </div>

            {/* Conditional rendering based on category selection */}
            {isSalaryCategory ? (
              /* Salary Category Fields - Only Month */
              <>
                <div className="form-control">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <i className="fa-solid fa-calendar-alt text-sm"></i>
                    Month <span className="text-error">*</span>
                  </label>
                  <select
                    disabled={loading}
                    className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    {...register("month", { 
                      required: "Month is required for salary expense" 
                    })}
                  >
                    <option value="">Select Month</option>
                    {months.map((month, idx) => (
                      <option key={idx} value={month}>{month}</option>
                    ))}
                  </select>
                  {errors.month && <p className="text-error text-sm mt-1">{errors.month.message}</p>}
                </div>
                
                {/* Empty div to maintain grid layout */}
                <div></div>
              </>
            ) : (
              /* Non-Salary Category Fields */
              <>
                {/* Amount */}
                <div className="form-control">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <i className="fa-solid fa-money-bill-wave text-sm"></i>
                    Amount <span className="text-error">*</span>
                  </label>
                  <input
                    disabled={loading}
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Enter Amount e.g: 15000.00"
                    className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    {...register("amount", { 
                      required: "Amount is required",
                      min: { value: 0.01, message: "Amount must be greater than 0" } 
                    })}
                  />
                  {errors.amount && <p className="text-error text-sm mt-1">{errors.amount.message}</p>}
                </div>

                {/* Expense Date */}
                <div className="form-control">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <i className="fa-solid fa-calendar-day text-sm"></i>
                    Expense Date <span className="text-error">*</span>
                  </label>
                  <input
                    disabled={loading}
                    type="date"
                    className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    max={new Date().toISOString().split("T")[0]}
                    {...register("expense_date", { 
                      required: "Expense Date is required" 
                    })}
                  />
                  {errors.expense_date && <p className="text-error text-sm mt-1">{errors.expense_date.message}</p>}
                </div>

                {/* Payment Method */}
                <div className="form-control">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <i className="fa-solid fa-credit-card text-sm"></i>
                    Payment Method <span className="text-error">*</span>
                  </label>
                  <select
                    disabled={loading}
                    className="select select-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    {...register("payment_method", { 
                      required: "Payment method is required" 
                    })}
                  >
                    <option value="">Select Payment Mode</option>
                    {paymentModes.map((mode, idx) => (
                      <option key={idx} value={mode}>{mode}</option>
                    ))}
                  </select>
                  {errors.payment_method && <p className="text-error text-sm mt-1">{errors.payment_method.message}</p>}
                </div>

                {/* Cheque Number - Only for Cheque payment */}
                {isChequePayment && (
                  <div className="form-control">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <i className="fa-solid fa-receipt text-sm"></i>
                      Cheque Number <span className="text-error">*</span>
                    </label>
                    <input
                      disabled={loading}
                      type="text"
                      placeholder="Enter Cheque Number e.g: CHQ987654"
                      className="input input-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      {...register("cheque_number", { 
                        required: isChequePayment && "Cheque number is required for cheque payment"
                      })}
                    />
                    {errors.cheque_number && <p className="text-error text-sm mt-1">{errors.cheque_number.message}</p>}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Description - Only for NON-Salary categories */}
          {!isSalaryCategory && (
            <div className="grid grid-cols-1 gap-6">
              <div className="form-control">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <i className="fa-solid fa-align-left text-sm"></i>
                  Description
                </label>
                <textarea
                  disabled={loading}
                  placeholder="Enter your expense description"
                  className="textarea textarea-bordered w-full focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={5}
                  maxLength={100}
                  {...register("description", {
                    maxLength: {
                      value: 100,
                      message: "Maximum 100 characters allowed",
                    },
                  })}
                />
                {errors.description && (
                  <p className="text-error text-sm mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-center pt-6 gap-4">
            <button type="submit" className="btn bgTheme text-white w-full md:w-40">
              {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>}
              {loading ? "" : "Create"}
            </button>
          </div>
        </form>
      </div>

      <SuccessModal ref={modalRef} navigateTo={handleNavigation} buttonText="Continue" message="Successfully Created Expense!" />

      {showModal && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white text-black dark:bg-gray-800 dark:text-white">
            <h3 className="font-bold text-lg">Expenses Submission</h3>
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