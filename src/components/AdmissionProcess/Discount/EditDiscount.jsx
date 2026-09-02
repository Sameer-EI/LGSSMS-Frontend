import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";
import { fetchStudents1, fetchYearLevels } from "../../../services/api/Api";
import { updateDiscount } from "../../../services/api/Api";
import { allRouterLink } from "../../../router/AllRouterLinks";
import { fetchDiscounts } from "../../../services/api/Api";

const EditDiscount = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { axiosInstance } = useContext(AuthContext);

  const [discountData, setDiscountData] = useState(null);

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const [formData, setFormData] = useState({
    discount_name: "",
    discounted_amount_percent: ""
  });


  useEffect(() => {
    const loadDiscount = async () => {
      try {
        const token = JSON.parse(localStorage.getItem("authTokens"))?.access;

        const allDiscounts = await fetchDiscounts(token);

        const single = allDiscounts.find((d) => d.id === parseInt(id));
        setDiscountData(single);

        if (single) {
          setFormData({
            discount_name: single.discount_name,
            discounted_amount_percent: single.discounted_amount_percent,
          });
        }
      } catch (err) {
        console.error("Error loading discount data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDiscount();
  }, [id]);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await fetchYearLevels();
        setClasses(data);
      } catch { }
    };

    loadClasses();
  }, []);

  // useEffect(() => {
  //   const loadStudents = async () => {
  //     if (!discountData?.student) return;
  //     try {
  //       const data = await fetchStudents1(discountData.year_level);
  //       setStudents(data);
  //     } catch { }
  //   };

  //   loadStudents();
  // }, [discountData]);

  useEffect(() => {
    const loadFeeTypes = async () => {
      if (!discountData?.year_level) return;
      try {
        const res = await axiosInstance.get(
          `/d/feestructures/?year_level_id=${discountData.year_level}`
        );
        setFeeTypes(res.data);
      } catch { }
    };

    loadFeeTypes();
  }, [discountData]);


  const handleChange = (field, value) => {
    if (field === "discount_name" && value.length > 100) return;
    if (field === "discounted_amount_percent") {
      const num = parseFloat(value);
      if (num > 100) return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const token = JSON.parse(localStorage.getItem("authTokens"))?.access;

      const payload = {
        discount_name: formData.discount_name,
        discounted_amount_percent: parseFloat(formData.discounted_amount_percent),
      };

      await updateDiscount(token, id, payload);

     setAlertTitle("Edit Discount");
      setAlertMessage("Discount updated successfully!");
      setModalOpen(true);

    }catch (err) {
    console.error(err);

    // Check if the error message matches the specific validation
    let message = "Failed to update discount.";
    if (err?.response?.data?.detail) {
      message = err.response.data.detail;
    }

    setAlertTitle("Edit Discount");
    setAlertMessage(message);
    setModalOpen(true);
  } finally {
      setSubmitLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    navigate(allRouterLink.discountedStudents);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">Loading discount details...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 mb-24 md:mb-10">
      <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg my-5">

        <h1 className="text-3xl font-bold text-center mb-8">
          <i className="fa-solid fa-edit mr-2"></i> Edit Discount
        </h1>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Student */}
            <div >
              <label className="label">Student</label>
              <input
                className="input input-bordered w-full bg-gray-200 dark:bg-gray-700"
                value={discountData?.student_name || ""}
                disabled
              />
            </div>

            {/* Fee Type */}
            <div>
              <label className="label">Fee Type</label>
              <input
                className="input input-bordered w-full bg-gray-200 dark:bg-gray-700"
                value={discountData?.fee_type_name || ""}
                disabled
              />
            </div> </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discount Name */}
            <div>
              <label className="label">Discount Name</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={formData.discount_name}
                onChange={(e) => handleChange("discount_name", e.target.value)}
              />
            </div>

            {/* Discount Percent */}
            <div>
              <label className="label">Discount Percentage</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input input-bordered w-full"
                value={formData.discounted_amount_percent}
                onChange={(e) => handleChange("discounted_amount_percent", e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
           <div className="flex justify-center pt-6">
          <button
             className="btn btn-primary w-full md:w-52 bgTheme text-white"
            disabled={submitLoading}
          >
            {submitLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <>
                <i className="fa-solid fa-save mr-2"></i>  Update
              </>
            )}
          </button></div>
        </form>

        {/* Modal */}
        {modalOpen && (
          <dialog open className="modal modal-open">
            <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
              <h3 className="font-bold text-lg">{alertTitle}</h3>
              <p className="py-4">{alertMessage}</p>
              <div className="modal-action">
                <button
                  className="btn bgTheme text-white"
                  onClick={closeModal}
                >
                  OK
                </button>
              </div>
            </div>
          </dialog>
        )}

      </div>
    </div>
  );
};

export default EditDiscount;
