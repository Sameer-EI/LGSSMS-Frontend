import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader } from "../../../global/Loader";
import axios from "axios";
import { constants } from "../../../global/constants";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchSchoolYear } from "../../../services/api/Api";
import { Error } from "../../../global/Error";
import { allRouterLink } from "../../../router/AllRouterLinks";

export const PaySalaryExpense = () => {
  const { id } = useParams();
  const role = localStorage.getItem("userRole");
  const authTokens = JSON.parse(localStorage.getItem("authTokens"));
  const access = authTokens.access;
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [schoolYear, setSchoolYear] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const preSelectedMonth = location.state?.selectedMonth || "";
  const paymentModes = ["cash", "cheque", "online"];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      month: preSelectedMonth,
    },
  });
  const selectedPaymentMethod = watch("payment_method");

  useEffect(() => {
    const getSchoolYearLevel = async () => {
      try {
        const response = await fetchSchoolYear();
        setSchoolYear(response);
      } catch (err) {
        setError(err);
      }
    };
    getSchoolYearLevel();
  }, []);

  useEffect(() => {
    const fetchSingleSalaryData = async () => {
      try {
        setPageLoading(true);
        const response = await axios.get(
          `${constants.baseUrl}/d/Employee/get_emp/?id=${id}`,
          {
            headers: { Authorization: `Bearer ${access}` },
          }
        );
        if (response.data) {
          setValue("user", response.data.id);
          setValue("name", response.data.name);
          setValue("base_salary", response.data.base_salary);
        }
      } catch (err) {
        setAlertMessage("Failed to fetch salary data");
        setShowAlert(true);
      } finally {
        setPageLoading(false);
      }
    };
    fetchSingleSalaryData();
  }, [id]);

  useEffect(() => {
    const baseSalary = Number(watch("base_salary") || 0);
    const deductions = Number(watch("deductions") || 0);
    const validDeductions = deductions > baseSalary ? baseSalary : deductions;
    setValue("deductions", validDeductions);
    setValue("gross_amount", baseSalary);
    setValue("net_amount", baseSalary - validDeductions);
  }, [watch("base_salary"), watch("deductions")]);

  const handleNavigation = () => {
    navigate(`${allRouterLink.viewSalaryExpense}`);
  };

  // const onSubmit = async (data) => {
  //   try {
  //     setLoading(true);
  //     if (data.payment_method.toLowerCase() === "online") {
  //       const orderResponse = await axios.post(
  //         `${constants.baseUrl}/d/Employee-salary/initiate-salary-payment/`,
  //         data,
  //         { headers: { Authorization: `Bearer ${access}`, "Content-Type": "multipart/form-data" } }
  //       );

  //       const { id: salary_id, net_amount, currency, razorpay_key, razorpay_order_id } = orderResponse.data;

  //       const options = {
  //         key: razorpay_key,
  //         amount: net_amount,
  //         currency,
  //         name: "Salary Expense",
  //         description: data.description,
  //         order_id: razorpay_order_id,
  //         handler: async function (response) {
  //           await axios.post(
  //             `${constants.baseUrl}/d/Employee-salary/confirm-salary-payment/`,
  //             {
  //               razorpay_payment_id: response.razorpay_payment_id,
  //               razorpay_order_id: response.razorpay_order_id,
  //               razorpay_signature: response.razorpay_signature,
  //               salary_id,
  //             },
  //             { headers: { Authorization: `Bearer ${access}` } }
  //           );
  //           setAlertMessage("Successfully paid the salary!");
  //           setShowAlert(true);
  //         },
  //         prefill: { name: data.name, email: data.email, contact: data.contact },
  //         theme: { color: constants.bgTheme },
  //       };
  //       new window.Razorpay(options).open();
  //     } else {
  //       const response = await axios.post(`${constants.baseUrl}/d/Employee-salary/`, data, {
  //         headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
  //       });
  //       if (response.status === 201) {
  //         setAlertMessage("Successfully paid the salary!");
  //         setShowAlert(true);
  //       }
  //     }
  //   } catch (error) {
  //     if (error.response?.data) {
  //       const errors = error.response.data;
  //       const msg =
  //         errors.non_field_errors?.join(" ") ||
  //         Object.entries(errors)
  //           .map(([field, msgs]) => `${msgs.join(", ")}`)
  //           .join(" | ") ||
  //         "Failed to pay salary";
  //       setAlertMessage(msg);
  //     } else {
  //       setAlertMessage("An unexpected error occurred.");
  //     }
  //     setShowAlert(true);
  //   } finally {
  //     setLoading(false);
  //   }
  // };


const onSubmit = async (data) => {
  try {
    setLoading(true);

    const payload = {
      employees: [Number(id)],
      months: [data.month || "November"],
      deductions: Number(data.deductions) || 0,
      bonus: Number(data.bonus) || 0,
      payment_method:
        data.payment_method.charAt(0).toUpperCase() +
        data.payment_method.slice(1).toLowerCase(),
      created_at: data.created_at || new Date().toISOString().split("T")[0],
      remarks: data.remarks || "Salary for employees",
    };

    if (data.payment_method.toLowerCase() === "cheque") {
      payload.cheque_number = data.cheque_number;
    }

    if (data.payment_method.toLowerCase() === "online") {
      const orderResponse = await axios.post(
        `${constants.baseUrl}/d/Employee-salary/`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${access}`,
            "Content-Type": "application/json",
          },
        }
      );

      const backendMsg = orderResponse.data?.message || "Salary created";

      if (
        !orderResponse.data?.razorpay_key ||
        !orderResponse.data?.razorpay_order_id ||
        !orderResponse.data?.net_amount
      ) {
        setAlertMessage(backendMsg);
        setShowAlert(true);
        return;
      }

      const {
        id: salary_id,
        net_amount,
        currency,
        razorpay_key,
        razorpay_order_id,
      } = orderResponse.data;

      const options = {
        key: razorpay_key,
        amount: net_amount,
        currency,
        name: "Salary Expense",
        description: data.remarks,
        order_id: razorpay_order_id,

        handler: async function (response) {
          await axios.post(
            `${constants.baseUrl}/d/Employee-salary/`,
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              salary_id,
            },
            {
              headers: { Authorization: `Bearer ${access}` },
            }
          );

          setAlertMessage("Successfully paid the salary!");
          setShowAlert(true);
        },

        theme: { color: constants.bgTheme },
      };

      new window.Razorpay(options).open();
      return;
    }

    const res = await axios.post(
      `${constants.baseUrl}/d/Employee-salary/`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${access}`,
          "Content-Type": "application/json",
        },
      }
    );

    setAlertMessage(res.data?.message || "Salary paid successfully");
    setShowAlert(true);
  } 

  catch (error) {
    const msg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Failed To Pay Salary";
    setAlertMessage(msg);
    setShowAlert(true);
  } 
  
  finally {
    setLoading(false);
  }
};



  if (pageLoading) return <Loader />;
  if (error) return <Error />;

  return (
    <div className="min-h-screen p-5 bg-gray-50 mb-24 md:mb-10 dark:bg-gray-900">
      <div className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-8">
          Pay Salary <i className="fa-solid fa-percentage ml-2"></i>
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee Name  */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Employee Name
                </span>
              </label>
              <input
                disabled={true}
                type="text"
                className="input input-bordered w-full focus:outline-none"
                {...register("name")}
              />
            </div>
            {/* Net Amount */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-money-bill text-sm"></i>
                  Net Amount <span className="text-error">*</span>
                </span>
              </label>
              <input
                disabled
                type="number"
                className="input input-bordered w-full focus:outline-none"
                {...register("net_amount")}
              />
            </div>

            {/* Month */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-calendar text-sm"></i>
                  Month
                </span>
              </label>
              <input
                type="text"
                disabled
                className="input input-bordered w-full focus:outline-none"
                value={watch("month") || ""}
                {...register("month")}
              />
            </div>

            {/* Gross Amount Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-sack-dollar text-sm"></i>
                  Gross Amount <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                min={0}
                disabled
                className="input input-bordered w-full focus:outline-none"
                {...register("base_salary")}
              />
            </div>

            {/* Deductions */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-minus-circle text-sm"></i>
                  Deductions
                </span>
              </label>
              <input
                placeholder="Enter deduction amount: e.g :150 "
                type="number"
                min={0}
                max={watch("base_salary")}
                className="input input-bordered w-full focus:outline-none"
                {...register("deductions")}
              />
            </div>
            {/* School Year */}
            {/* <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  School Year <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                {...register("school_year", {
                  required: "School Year is required",
                })}
              >
                <option value="">Select School year</option>
                {schoolYear.map((year) => (
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
            </div> */}

            {/* Payment Date */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-calendar-day text-sm"></i>
                  Payment Date <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full focus:outline-none"
                max={new Date().toISOString().split("T")[0]} // future dates disable
                {...register("payment_date", {
                  required: "Payment Date is required",
                  validate: (value) => {
                    const selectedDate = new Date(value).toISOString().split("T")[0];
                    const today = new Date().toISOString().split("T")[0];
                    return selectedDate <= today || "Payment date cannot be in the future";
                  },
                })}
              />
              {errors.payment_date && (
                <p className="text-error text-sm mt-1">{errors.payment_date.message}</p>
              )}
            </div>
            {/* Payment Method */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Payment Method <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                {...register("payment_method", {
                  required: "Payment Method is required",
                })}
              >
                <option value="">Select Payment Method</option>
                {paymentModes.map((modes, idx) => (
                  <option className="capitalize" key={idx} value={modes}>
                    {modes}
                  </option>
                ))}
              </select>
              {errors.payment_method && (
                <p className="text-error text-sm mt-1">
                  {errors.payment_method.message}
                </p>
              )}
            </div>
            {selectedPaymentMethod?.toLowerCase() === "cheque" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-1">
                    <i className="fa-solid fa-hashtag text-sm"></i>
                    Cheque Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Enter cheque number e.g. CHQ123456"
                  className="input input-bordered w-full focus:outline-none"
                  {...register("cheque_number", {
                    required: "Cheque number is required when using cheque",
                    pattern: {
                      value: /^[A-Za-z0-9-]+$/,
                      message: "Cheque number must be alphanumeric",
                    },
                  })}
                />
                {errors.cheque_number && (
                  <p className="text-error text-sm mt-1">
                    {errors.cheque_number.message}
                  </p>
                )}
              </div>
            )}
          </div>




          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            {/* Description Field */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-align-left text-sm"></i>
                  Description <span className="text-error"></span>
                </span>
              </label>
              <textarea
                placeholder="Enter your category description"
                className="textarea textarea-bordered w-full focus:outline-none"
                rows={5}
                maxLength={100}
                {...register("description", {
                  maxLength: {
                    value: 100,
                    message: "Description cannot exceed 150 characters",
                  },
                })}
              />
              {errors.description && (
                <p className="text-error text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>
          </div>


          <div className="flex flex-col md:flex-row justify-center pt-6 gap-4">
            <button type="submit" className="btn bgTheme text-white w-full md:w-40">
              {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>}
              {loading ? "" : "Pay"}
            </button>
          </div>
        </form>
      </div>

      {/* Alert Modal */}
      {showAlert && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            <h3 className="font-bold text-lg">Salary Payment</h3>
            <p className="py-4 capitalize">
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
                onClick={() => {
                  setShowAlert(false);
                  handleNavigation();
                }}
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
