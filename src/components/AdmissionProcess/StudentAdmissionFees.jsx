import { useState, useEffect, useRef, useContext } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { constants } from "../../global/constants";
import PaymentStatusDialog from "./PaymentStatusDialog";
import PaymentStatusDialogOffline from "./PaymentStatusDialogOffline";
import { fetchSchoolYear, fetchStudents1 } from "../../services/api/Api";
import { AuthContext } from "../../context/AuthContext";

export const StudentAdmissionFees = () => {
  const [students, setStudents] = useState([]);
  const [availableFees, setAvailableFees] = useState([]);
  const [selectedFeeIds, setSelectedFeeIds] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaymentDialog1, setShowPaymentDialog1] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [studentYearId, setStudentYearId] = useState(null);
  const [selectedSchYear, setselectedSchYear] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [schoolYear, setSchoolYear] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [apiError, setApiError] = useState("");
  const { axiosInstance } = useContext(AuthContext);

  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [searchStudentInput, setSearchStudentInput] = useState("");
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  const authTokens = JSON.parse(localStorage.getItem("authTokens"));
  const accessToken = authTokens?.access; 
  const BASE_URL = constants.baseUrl;
  const UserRole = window.localStorage.getItem("userRole");

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      student_id: "",
      month: "",
      paid_amount: "",
      payment_mode: "",
      remarks: "",
      received_by: "",
    },
  });

  const selectedStudentId = watch("student_id");
  const selectedPaymentMode = watch("payment_mode");

  // Fetch all classes
  const getClasses = async () => {
    try {
      setIsLoading(true);
      setApiError("");
      const response = await axios.get(`${BASE_URL}/d/year-levels/`);
      setClasses(response.data);
    } catch (err) {
      console.log(err);
      setApiError("Failed to load classes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableFees = async (studentId) => {
    if (!studentId || !selectedSchYear) {
      setAvailableFees([]);
      return [];
    }

    try {
      setIsLoadingFees(true);
      const [feePreviewRes, structureRes] = await Promise.all([
        axiosInstance.get(
          `${BASE_URL}/d/studentfees/fee_preview/?student_year_id=${studentId}&school_year_id=${selectedSchYear}`
        ),
        axiosInstance.get(`${BASE_URL}/d/feestructures/?year_level_id=${selectedClassId}`)
      ]);

      let previewData = Array.isArray(feePreviewRes.data) ? feePreviewRes.data : [];
      let structures = Array.isArray(structureRes.data) ? structureRes.data : [];

      // Map months properly: fallback if month_id missing
      const monthMap = {
        January: 1,
        February: 2,
        March: 3,
        April: 4,
        May: 5,
        June: 6,
        July: 7,
        August: 8,
        September: 9,
        October: 10,
        November: 11,
        December: 12,
      };

      // Attach fee_structure_id + ensure month_id exists
      previewData.forEach((monthData) => {
        monthData.month_id = monthData.month_id || monthMap[monthData.month] || null;

        monthData.fees = monthData.fees.map((fee) => {
          const structure = structures.find((s) => s.fee_type === fee.fee_type);
          return {
            ...fee,
            fee_structure_id: structure ? structure.id : null,
            due_amount:
              (parseFloat(fee.original_amount || 0) || 0) -
              (parseFloat(fee.paid_amount || 0) || 0),
          };
        });
      });

      setAvailableFees(previewData);
      return previewData;
    } catch (error) {
      console.error("Error fetching fees:", error);
      setApiError("Failed to load fees");
      setAvailableFees([]);
      return [];
    } finally {
      setIsLoadingFees(false);
    }
  };

  // Fetch students for selected class
  const getStudents = async (classId) => {
    try {
      setIsLoading(true);
      setApiError("");
      const Students = await fetchStudents1(classId);
      setStudents(Students);
    } catch (err) {
      console.log(err);
      setApiError("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch school_year
  const getSchool_year = async () => {
    try {
      const obj = await fetchSchoolYear();
      setSchoolYear(obj);
    } catch (err) {
      console.log("Failed to load school years. Please try again." + err);
    }
  };

  useEffect(() => {
    getClasses();
    getSchool_year();
  }, []);

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    reset({
      student_id: "",
      month: "",
      paid_amount: "",
      payment_mode: "",
      remarks: "",
      received_by: "",
    });
    setSelectedFeeIds([]);
    setSelectedStudent(null);
    setStudentYearId(null);
    setAvailableFees([]);
    setAvailableMonths([]);
    setApiError("");
    setSelectedStudentName("");
  };

  useEffect(() => {
    if (selectedClassId) {
      getStudents(selectedClassId);
      setSelectedStudent(null);
      setSelectedStudentName("");
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

 
  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(
        (s) => s.student_id === parseInt(selectedStudentId)
      );
      setSelectedStudent(student || null);
      setStudentYearId(student ? student.id : null); 
    } else {
      setSelectedStudent(null);
      setStudentYearId(null);
      setAvailableFees([]);
      setSelectedFeeIds([]);
    }
  }, [selectedStudentId, students]);

  // Fetch fees whenever studentYearId or school year changes
  useEffect(() => {
    if (studentYearId && selectedSchYear) {
      fetchAvailableFees(studentYearId);
    } else {
      setAvailableFees([]);
    }
  }, [studentYearId, selectedSchYear, selectedClassId]);

  const role = localStorage.getItem("userRole");
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fix role condition
  const isStaffOrDirector =
    role === constants.roles.officeStaff || role === constants.roles.director;

  const paymentModes = isStaffOrDirector
    ? ["cash", "cheque", "online"]
    : ["online"];

  // Optional legacy function (kept if needed elsewhere)
  const displayRazorpay = async (payload) => {
    try {
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) throw new Error("Razorpay SDK failed to load");

      const orderResponse = await axiosInstance.post(
        `${BASE_URL}/d/fee-record/initiate-payment/`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const {
        razorpay_order_id: orderId,
        currency,
        receipt_number,
        paid_amount: orderAmount,
      } = orderResponse.data;
      const {
        student_id,
        received_by,
        payment_mode,
        paid_amount,
        selected_fees,
      } = payload;

      const options = {
        key: "rzp_test_4h2aRSAPbYw3f8",
        amount: orderAmount,
        currency: currency,
        name: "School Fee Payment",
        description: `Receipt: ${receipt_number}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            const verificationPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              student_id: parseInt(student_id),
              month: selected_fees,
              received_by: received_by,
              payment_mode: payment_mode,
              paid_amount: paid_amount,
            };

            const verificationResponse = await axiosInstance.post(
              `${BASE_URL}/d/fee-record/confirm-payment/`,
              verificationPayload,
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );

            if (verificationResponse.data) {
              setPaymentStatus(verificationResponse.data);
              setShowPaymentDialog(true);
            } else {
              setPaymentStatus("Payment verification failed - No data received");
            }
          } catch (error) {
            console.log(
              " VERIFICATION ERROR:",
              error.response?.data || error.message
            );
            setPaymentStatus("Payment verification failed");
          }
        },
        prefill: {
          name: selectedStudent?.student_name || "",
          email: selectedStudent?.email || "",
        },
        notes: {
          student_id: student_id,
          receipt_number: receipt_number,
        },
        theme: { color: "#5E35B1" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.log(
        " PAYMENT INITIATION ERROR:",
        error.response?.data || error.message
      );
      setPaymentStatus("Payment failed. Please try again.");
    }
  };

  const onSubmit = async (data) => {
    if (selectedFeeIds.length === 0) {
      alert("Please select at least one fee to pay");
      return;
    }

    const paymentMode = data.payment_mode.toLowerCase();
    const schoolYearId = selectedSchYear;
    const paidAmount = parseFloat(data.paid_amount) || 0;

    if (!selectedStudent || !studentYearId) {
      alert("Please select a student.");
      return;
    }

    // Build a list of all selected fees with due amounts
    const selectedFeeObjects = [];
    availableFees.forEach((monthData) => {
      const monthId = monthData.month_id;

      monthData.fees.forEach((fee) => {
        const rowKey = `${monthData.month}-${fee.fee_id}`;

        if (selectedFeeIds.includes(rowKey)) {
          const original = parseFloat(fee.original_amount) || 0;
          const paid = parseFloat(fee.paid_amount) || 0;
          const due = Math.max(original - paid, 0);

          selectedFeeObjects.push({
            fee_structure_id: fee.fee_structure_id || fee.fee_id, // fallback fixed
            month: monthId,
            due_amount: due,
          });
        }
      });
    });

    // Sort fees by highest due amount
    selectedFeeObjects.sort((a, b) => b.due_amount - a.due_amount);

    // Distribute paid amount across selected fees
    let remainingAmount = paidAmount;
    const distributedFees = [];

    selectedFeeObjects.forEach((feeObj) => {
      const amountToPay = Math.min(remainingAmount, feeObj.due_amount);
      remainingAmount -= amountToPay;

      distributedFees.push({
        fee_type_id: feeObj.fee_structure_id,
        month: feeObj.month,
        amount: parseFloat(amountToPay.toFixed(2)),
      });
    });

    if (remainingAmount > 0) {
      console.log(
        "Remaining amount after distributing to fees:",
        remainingAmount
      );
    }

    // Prepare payload with distributed fees
    const payload = {
      student_year_id: studentYearId,
      school_year_id: schoolYearId,
      payment_method: paymentMode,
      // due_date: new Date().toISOString().split("T")[0],
      paid_amount: paidAmount,
      fees: distributedFees,
    };

    try {
      // Submit payment request
    

      if (paymentMode === "online") {
          const submitResInitial = await axiosInstance.post(
        `${BASE_URL}/d/studentfees/initiate_payment/`,
        payload
      );
        const { razorpay_order_id, amount, currency, receipt } = submitResInitial.data;

        const options = {
          key: "rzp_test_4h2aRSAPbYw3f8",
          amount: paidAmount * 100,
          currency: "INR",
          name: "School Fee Payment",
          description: `Receipt: ${receipt}`,
          order_id: razorpay_order_id,
          handler: async function (response) {
            const verifyPayload = {
              student_year_id: studentYearId,
              selected_fees: distributedFees,
              paid_amount: paidAmount,
              payment_mode: paymentMode,
              received_by: 2, // adjust as needed
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };

            const confirmRes = await axiosInstance.post(
              `${BASE_URL}/d/studentfees/confirm_payment/`,
              verifyPayload
            );

            setPaymentStatus(confirmRes.data);
            setShowPaymentDialog(true);
          },
          prefill: {
            name: selectedStudent?.student_name || "",
            email: selectedStudent?.email || "",
          },
          theme: { color: "#5E35B1" },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const submitRes = await axiosInstance.post(
        `${BASE_URL}/d/studentfees/submit_fee/`,
        payload
      );
        setPaymentStatus(submitRes.data);
        setShowPaymentDialog1(true);
      }
    } catch (err) {
      console.error("Payment failed", err);
      setPaymentStatus("Payment failed. Please try again.");
    }
  };

  const calculateTotalAmount = () => {
    let baseAmount = 0;
    let paidAmount = 0;
    let dueAmount = 0;

    availableFees.forEach((monthData) => {
      monthData.fees.forEach((fee) => {
        const rowKey = `${monthData.month}-${fee.fee_id}`;
        if (selectedFeeIds.includes(rowKey)) {
          const original = parseFloat(fee.original_amount) || 0;
          const paid = parseFloat(fee.paid_amount) || 0;
          baseAmount += original;
          paidAmount += paid;
          dueAmount += Math.max(original - paid, 0);
        }
      });
    });

    return {
      baseAmount,
      paidAmount,
      dueAmount,
      totalAmount: dueAmount,
    };
  };

  const totalAmount = calculateTotalAmount();

  const handleFeeSelection = (feeId, isSelected) => {
    if (isSelected) setSelectedFeeIds((prev) => [...prev, feeId]);
    else setSelectedFeeIds((prev) => prev.filter((id) => id !== feeId));
  };

  // Keep paid_amount synced to total selected due
  useEffect(() => {
    const totals = calculateTotalAmount();
    setValue("paid_amount", totals.totalAmount.toFixed(2), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [selectedFeeIds, availableFees, setValue]);

  const stuId = window.localStorage.getItem("student_id");
  const stuYearlvlName = localStorage.getItem("stu_year_level_name");
  const stuYearlvlId = localStorage.getItem("stu_year_level_id");

  const handleRetry = () => {
    if (studentYearId) {
      fetchAvailableFees(studentYearId);
    }
  };

  // Filter students by name or scholar number
  const filteredStudents = students
    ?.filter((student) =>
      `${student?.student_name || ""} ${student?.scholar_number || ""}`
        .toLowerCase()
        .includes(searchStudentInput.trim().toLowerCase())
    )
    .sort((a, b) => a.student_name.localeCompare(b.student_name));

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStudentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMonthSelection = (monthData, isChecked) => {
    const updatedSelectedFeeIds = [...selectedFeeIds];

    monthData.fees.forEach((fee) => {
      const rowKey = `${monthData.month}-${fee.fee_id}`;
      const isSelectable = fee.status !== "Paid";

      if (isSelectable) {
        const index = updatedSelectedFeeIds.indexOf(rowKey);

        if (isChecked && index === -1) {
          updatedSelectedFeeIds.push(rowKey);
        } else if (!isChecked && index !== -1) {
          updatedSelectedFeeIds.splice(index, 1);
        }
      }
    });

    setSelectedFeeIds(updatedSelectedFeeIds);
  };

  // Gate for disabling bottom inputs and button until payment mode selected
  const isPaymentModeSelected = !!selectedPaymentMode;
  const isSubmitDisabled =
    isSubmitting || selectedFeeIds.length === 0 || !isPaymentModeSelected;

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

  if (isLoadingFees && !apiError) {
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

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
        <button className="bg-red-400 btn text-white" onClick={handleRetry}>
          retry
        </button>
      </div>
    );
  }

  return (
    <div className="mb-24 md:mb-10">
      <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900">
        <form
          className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm focus:outline-none"
          onSubmit={handleSubmit(onSubmit)}
        >
          <h1 className="text-3xl font-bold text-center mb-8">
            Fee Payment
            <i className="fa-solid fa-money-bill-wave ml-2"></i>
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* School Year */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-school text-sm"></i>
                  School Year <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                onChange={(e) => setselectedSchYear(e.target.value)}
                value={selectedSchYear || ""}
              >
                <option value="">Select Year</option>
                {schoolYear?.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Class Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-1">
                  <i className="fa-solid fa-school text-sm"></i>
                  Class <span className="text-error">*</span>
                </span>
              </label>
              <select
                className="select select-bordered w-full focus:outline-none"
                onChange={handleClassChange}
                value={selectedClassId || ""}
              >
                <option value="">Select Class</option>
                {UserRole === "director"
                  ? classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.level_name}
                      </option>
                    ))
                  : UserRole === "office staff"
                  ? classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.level_name}
                      </option>
                    ))
                  : UserRole === "guardian"
                  ? classes?.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.level_name}
                      </option>
                    ))
                  : null}
                {UserRole === "student" && (
                  <option key={stuYearlvlId} value={stuYearlvlId}>
                    {stuYearlvlName}
                  </option>
                )}
              </select>
            </div>

            {/* Student Selection */}
            <div className="form-control relative" ref={dropdownRef}>
              <label className="label">
                <span className="label-text flex items-center gap-1 text-gray-700 dark:text-gray-300">
                  <i className="fa-solid fa-user-graduate text-sm"></i>
                  Student <span className="text-error">*</span>
                </span>
              </label>

              <div
                className={`input input-bordered w-full flex items-center justify-between cursor-pointer ${
                  !selectedClassId ? "cursor-not-allowed opacity-70" : ""
                }`}
                disabled={!selectedClassId}
                onClick={() => {
                  if (selectedClassId) setShowStudentDropdown(!showStudentDropdown);
              
                }}
              >
                {selectedStudentName || "Select Student"}
                <div>
                  <span className="arrow">&#9662;</span>
                </div>
              </div>

              {/* Hidden input for form submission */}
              <input
                type="hidden"
                {...register("student_id", {
                  required: "Student selection is required",
                })}
                value={watch("student_id") || ""}
                readOnly
              />

              {/* Dropdown with search and list */}
              {showStudentDropdown && selectedClassId && (
                <div className="absolute z-10 bg-white text-gray-700 dark:bg-[#191b1b] dark:text-amber-50 rounded w-full mt-1 shadow-lg">
                  {/* Search input */}
                  <div className="p-2 sticky top-0 dark:bg-[#1c1f1f] shadow-sm bg-base-100">
                    <input
                      type="text"
                      placeholder="Search Student by Name or Scholar No..."
                      className="input input-bordered w-full focus:outline-none"
                      value={searchStudentInput}
                      onChange={(e) => setSearchStudentInput(e.target.value)}
                      autoComplete="off"
                    />
                  </div>

                  {/* Student results */}
                  <div className="max-h-40 overflow-y-auto">
                    {isLoading ? (
                      <p className="p-2">Loading students...</p>
                    ) : filteredStudents?.length > 0 ? (
                      filteredStudents.map((stu) => (
                        <p
                          key={stu.student_id}
                          className="p-2 hover:bg-base-200 cursor-pointer"
                          onClick={() => {
                            const displayName = `${stu.student_name} - ${stu.scholar_number} (Scholar No)`;
                            setSelectedStudentName(displayName);
                            setSearchStudentInput("");
                            setShowStudentDropdown(false);
                            setValue("student_id", stu.student_id, { shouldValidate: true });
                            clearErrors("student_id");
                            setSelectedStudent(stu);
                            setStudentYearId(stu.id); // set student_year_id
                            setSelectedFeeIds([]);
                          }}
                        >
                          {stu.student_name} - {stu.scholar_number} (Scholar No)
                        </p>
                      ))
                    ) : (
                      <p className="p-2">No students found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {errors.student_id && (
                <p className="text-error text-sm mt-1">{errors.student_id.message}</p>
              )}
            </div>

            {/* Payment Mode Selection */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Payment Mode <span className="text-error">*</span>
                </span>
              </label>
              <select
                className={`select w-full focus:outline-none ${
                  errors.payment_mode ? "select-error" : "select-bordered"
                }`}
                {...register("payment_mode", {
                  required: "Payment mode is required",
                })}
                disabled={!selectedStudentId}
              >
                <option value="">Select Payment Mode</option>
                {paymentModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
              {errors.payment_mode && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.payment_mode.message}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Available Fees Display */}
          {availableFees.length > 0 && selectedStudent && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-gray-100">
                Fee Details for {selectedStudent.student_name}
              </h2>

              {/* Fee Table */}
              <div className="overflow-x-auto">
                <div className="max-h-[500px] overflow-y-auto rounded-lg border">
                  <table className="table w-full">
                    <thead className="sticky top-0 bg-base-200 z-3">
                      <tr>
                        <th>Month</th>
                        <th>Fee Type</th>
                        <th>Original Amount</th>
                        <th>Paid</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Select</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.isArray(availableFees) &&
                        availableFees.map((monthData) =>
                          monthData.fees.map((fee, index) => {
                            const rowKey = `${monthData.month}-${fee.fee_id}`;
                            const isSelectable = fee.status !== "Paid";
                            const isChecked = selectedFeeIds.includes(rowKey);

                            const original = parseFloat(fee.original_amount) || 0;
                            const paid = parseFloat(fee.paid_amount) || 0;
                            const due = Math.max(original - paid, 0);

                            return (
                              <tr key={rowKey} className="hover">
                                {/* Month Column */}
                                {index === 0 && (
                                  <td
                                    rowSpan={monthData.fees.length}
                                    className="font-semibold bg-base-100 align-top px-4 py-2"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span>{monthData.month}</span>
                                      <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm checkbox-primary"
                                        checked={monthData.fees
                                          .filter((f) => f.status !== "Paid")
                                          .every((f) =>
                                            selectedFeeIds.includes(`${monthData.month}-${f.fee_id}`)
                                          )}
                                        onChange={(e) =>
                                          handleMonthSelection(monthData, e.target.checked)
                                        }
                                      />
                                    </div>
                                  </td>
                                )}

                                {/* Fee Type */}
                                <td>{fee.fee_type}</td>

                                {/* Amounts */}
                                <td>₹{original.toFixed(2)}</td>
                                <td>₹{paid.toFixed(2)}</td>
                                <td className={due > 0 ? "text-warning" : ""}>
                                  ₹{due.toFixed(2)}
                                </td>

                                {/* Status */}
                                <td>
                                  {fee.status === "Paid" ? (
                                    <span className="badge badge-success text-gray-900 dark:text-white">
                                      Paid
                                    </span>
                                  ) : fee.status === "Partial" ? (
                                    <span className="badge badge-warning text-gray-900 dark:text-white">
                                      Partial
                                    </span>
                                  ) : (
                                    <span className="badge badge-error text-gray-900 dark:text-white">
                                      Pending
                                    </span>
                                  )}
                                </td>

                                {/* Select */}
                                <td>
                                  {isSelectable ? (
                                    <input
                                      type="checkbox"
                                      className="checkbox checkbox-primary"
                                      checked={isChecked}
                                      onChange={(e) =>
                                        handleFeeSelection(rowKey, e.target.checked)
                                      }
                                    />
                                  ) : (
                                    <i className="fa-solid fa-check text-success"></i>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              {selectedFeeIds.length > 0 && (
                <div className="bg-base-300 p-4 rounded-lg mt-6">
                  <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>

                  <div className="grid grid-cols-2 gap-2">
                    {parseFloat(totalAmount.baseAmount) > 0 && (
                      <>
                        <div>Base Amount:</div>
                        <div className="text-right">
                          ₹{parseFloat(totalAmount.baseAmount).toFixed(2)}
                        </div>
                      </>
                    )}

                    {parseFloat(totalAmount.paidAmount) > 0 && (
                      <>
                        <div>Already Paid:</div>
                        <div className="text-right">
                          ₹{parseFloat(totalAmount.paidAmount).toFixed(2)}
                        </div>
                      </>
                    )}

                    {parseFloat(totalAmount.dueAmount) > 0 && (
                      <>
                        <div>Due Amount:</div>
                        <div className="text-right">
                          ₹{parseFloat(totalAmount.dueAmount).toFixed(2)}
                        </div>
                      </>
                    )}

                    <div className="font-bold mt-2 border-t pt-2">Total Payable Now:</div>
                    <div className="text-right font-bold mt-2 border-t pt-2">
                      ₹{parseFloat(totalAmount.totalAmount).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* No Fees Message */}
          {!isLoadingFees &&
            availableFees.length === 0 &&
            selectedStudentId && (
              <div className="text-center mt-8 text-gray-500">
                No fees found for the selected student and year.
              </div>
            )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Paid Amount */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calculator text-sm"></i>
                  Paid Amount <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="number"
                className={`input w-full focus:outline-none ${
                  errors.paid_amount ? "input-error" : "input-bordered"
                }`}
                {...register("paid_amount", {
                  required: "Amount is required",
                  min: { value: 0, message: "Amount must be positive" },
                  max: {
                    value: totalAmount.totalAmount,
                    message: `Amount cannot exceed ₹${totalAmount.totalAmount.toFixed(
                      2
                    )}`,
                  },
                })}
                value={watch("paid_amount")}
                disabled={selectedFeeIds.length === 0 || !isPaymentModeSelected}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > totalAmount.totalAmount) {
                    setValue("paid_amount", totalAmount.totalAmount.toFixed(2));
                  } else {
                    setValue("paid_amount", e.target.value);
                  }
                }}
                step="1"
                max={totalAmount.totalAmount}
              />

              {errors.paid_amount && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.paid_amount.message}
                  </span>
                </label>
              )}
            </div>

            {/* Remarks */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-comment text-sm"></i>
                  Remarks <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                maxLength={25}
                className={`input w-full focus:outline-none ${
                  errors.remarks ? "input-error" : "input-bordered"
                }`}
                {...register("remarks", {
                  required: "Remarks are required",
                  minLength: {
                    value: 3,
                    message: "Remarks must be at least 3 characters long",
                  },
                  maxLength: {
                    value: 25,
                    message: "Remarks cannot exceed 25 characters",
                  },
                })}
                placeholder="Enter any remarks"
                disabled={selectedFeeIds.length === 0 || !isPaymentModeSelected}
              />
              {errors.remarks && (
                <label className="label">
                  <span className="label-text-alt text-sm text-error">
                    {errors.remarks.message}
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-10">
            <button
              type="submit"
              className={`btn bgTheme text-white w-52 ${
                isSubmitDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700"
              }`}
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin mr-2"></i>
              ) : (
                <i className="fa-solid fa-money-bill-wave ml-2"></i>
              )}
              {isSubmitting ? "Processing..." : "Submit Payment"}
            </button>
          </div>
        </form>

        {/* Payment Status Dialogs */}
        {showPaymentDialog && paymentStatus && (
          <PaymentStatusDialog
            paymentStatus={paymentStatus}
            onClose={() => {
              setShowPaymentDialog(false);
              setPaymentStatus(null);
              window.location.reload();
            }}
          />
        )}

        {showPaymentDialog1 && paymentStatus && (
          <PaymentStatusDialogOffline
            paymentStatus={paymentStatus}
            onClose={() => {
              setShowPaymentDialog1(false);
              setPaymentStatus(null);
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
};