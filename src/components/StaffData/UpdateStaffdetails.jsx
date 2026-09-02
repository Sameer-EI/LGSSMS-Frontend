import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchTeachers,
  fetchOfficeStaff,
  editOfficeStaffdetails,
  editTeachersdetails,
  fetchCountry,
  fetchState,
  fetchCity,
} from "../../services/api/Api";
import { useForm } from "react-hook-form";
import UpdateSuccessful from "../Modals/UpdateModal";

const UpdateStaffDetails = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateModal, setUpdateModal] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // const { register, handleSubmit, setValue, watch, formState: { errors }, trigger } = useForm({
  //   mode: "onChange",
  //   reValidateMode: "onChange"
  // });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    mode: "onChange", // important for live validation
    reValidateMode: "onChange"
  });


  const countryVal = watch("address_data.country");
  const stateVal = watch("address_data.state");
  const cityVal = watch("address_data.city");

  const validationRules = {
    first_name: { pattern: /^[A-Za-z]{2,30}$/, message: "First name must be 2-30 letters" },
    middle_name: { pattern: /^[A-Za-z]{0,30}$/, message: "Middle name must be letters only" },
    last_name: { pattern: /^[A-Za-z]{2,30}$/, message: "Last name must be 2-30 letters" },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Invalid email format" },
    phone_no: { pattern: /^[6-9][0-9]{9}$/, message: "Phone number must be 10 digits starting with 6-9" },
    adhaar_no: { pattern: /^[2-9][0-9]{11}$/, message: "Aadhaar must be 12 digits starting with 2-9" },
    pan_no: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, message: "Invalid PAN format" },
    qualification: { pattern: /^[A-Za-z0-9\s\-,.]{2,50}$/, message: "Invalid qualification" },
    account_no: { pattern: /^[0-9]{9,18}$/, message: "Account number must be 9-18 digits" },
    ifsc_code: { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Invalid IFSC code" },
    holder_name: { pattern: /^[A-Za-z ]{2,50}$/, message: "Holder name must be letters only" },
    house_no: { pattern: /^[A-Za-z0-9\-\/ ]{1,10}$/, message: "Invalid house number" },
    habitation: { pattern: /^[A-Za-z0-9 ]{1,50}$/, message: "Invalid habitation" },
    ward_no: { pattern: /^[0-9]{1,5}$/, message: "Invalid ward number" },
    zone_no: { pattern: /^[0-9]{1,5}$/, message: "Invalid zone number" },
    block: { pattern: /^[A-Za-z0-9 ]{0,50}$/, message: "Invalid block" },
    district: { pattern: /^[A-Za-z ]{1,50}$/, message: "Invalid district" },
    division: { pattern: /^[A-Za-z ]{0,50}$/, message: "Invalid division" },
    area_code: { pattern: /^[0-9]{3,10}$/, message: "Invalid area code" },
    address_line: { pattern: /^[A-Za-z0-9,.\-\/ ]{0,100}$/, message: "Invalid address line" },
  };

  const handleInputChange = async (fieldName) => {
    await trigger(fieldName);
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [c, s, ci] = await Promise.all([fetchCountry(), fetchState(), fetchCity()]);
        setCountries(c);
        setStates(s);
        setCities(ci);

        const data = type === "teacher" ? await fetchTeachers(id) : await fetchOfficeStaff(id);

        // Prefill top-level fields
        setValue("first_name", data.first_name || "");
        setValue("middle_name", data.middle_name || "");
        setValue("last_name", data.last_name || "");
        setValue("email", data.email || "");
        setValue("phone_no", data.phone_no || "");
        setValue("gender", data.gender || "");
        setValue("adhaar_no", data.adhaar_no || "");
        setValue("pan_no", data.pan_no || "");
        setValue("qualification", data.qualification || "");
        setValue("joining_date", data.joining_date || "");

        setValue("banking_data.account_no", data.banking_data?.account_no || "");
        setValue("banking_data.ifsc_code", data.banking_data?.ifsc_code || "");
        setValue("banking_data.holder_name", data.banking_data?.holder_name || "");

        setValue("address_data.house_no", data.address_data?.house_no || "");
        setValue("address_data.habitation", data.address_data?.habitation || "");
        setValue("address_data.ward_no", data.address_data?.ward_no || "");
        setValue("address_data.zone_no", data.address_data?.zone_no || "");
        setValue("address_data.block", data.address_data?.block || "");
        setValue("address_data.district", data.address_data?.district || "");
        setValue("address_data.division", data.address_data?.division || "");
        setValue("address_data.area_code", data.address_data?.area_code || "");
        setValue("address_data.address_line", data.address_data?.address_line || "");

        const countryId = c.find(cn => cn.name === data.address_data?.country_name)?.id;
        const stateId = s.find(st => st.name === data.address_data?.state_name)?.id;
        const cityId = ci.find(ct => ct.name === data.address_data?.city_name)?.id;

        setValue("address_data.country", countryId || "");
        setValue("address_data.state", stateId || "");
        setValue("address_data.city", cityId || "");

      } catch (err) {
        setError(err.message || "Failed to fetch staff details");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, type, setValue]);

  const onSubmit = async (formData) => {
    try {
      setSubmitting(true);
      const payload = new FormData();
      const mapNested = (prefix, data) => {
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined) {
            payload.append(`${prefix}.${k}`, v.toString());
          }
        });
      };

      Object.entries(formData).forEach(([key, value]) => {
        if (typeof value !== "object" && value !== null && value !== undefined) {
          payload.append(key, value.toString());
        }
      });

      if (formData.user_profile && formData.user_profile[0]) {
        payload.append("user_profile", formData.user_profile[0]);
      }

      if (formData.banking_data) {
        mapNested("banking_detail_input", formData.banking_data);
      }

      if (formData.address_data) {
        mapNested("address_input", formData.address_data);
      }

      if (type === "teacher") {
        await editTeachersdetails(id, payload);
      } else {
        await editOfficeStaffdetails(id, payload);
      }

      setUpdateModal(true);
      setFormErrors([]);
    }
    catch (err) {
      console.error("Update error:", err);

      let backendErrors = [];

      // Use err.response.data if available, otherwise err itself
      const data = (err?.response?.data) ? err.response.data : err;

      const parseErrors = (obj) => {
        let result = [];
        if (!obj) return result;

        if (typeof obj === "string") {
          result.push(obj);
        } else if (Array.isArray(obj)) {
          obj.forEach(msg => result.push(msg));
        } else if (typeof obj === "object") {
          Object.values(obj).forEach(val => {
            result = result.concat(parseErrors(val));
          });
        }
        return result;
      };

      backendErrors = parseErrors(data);

      // Fallback
      if (backendErrors.length === 0) {
        backendErrors.push("An unexpected error occurred. Please try again.");
      }
      console.log("Final backend errors to display:", backendErrors);
      setFormErrors(backendErrors);
    } finally {
      setSubmitting(false);
    }





  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen">
    <div className="flex space-x-2">
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
      <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
    </div>
    <p className="mt-2 text-gray-500 text-sm">Loading data...</p>
  </div>
  if (error) return <div className="text-center text-red-500 mt-10"><p>{error}</p></div>;

  const maxDate = new Date().toISOString().split("T")[0];

  return (
    <div className="mb-24 md:mb-10">
      <div className="p-6 bg-gray-100 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow dark:shadow-gray-700">
          <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">
            {type?.toLowerCase() === "teacher" ? "Update Teacher Details" : "Update Staff Details"}
          </h1>

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" encType="multipart/form-data">

            {/* Top-level Fields */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">First Name</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("first_name", {
                  required: "First Name is required",
                  pattern: {
                    value: validationRules.first_name.pattern,
                    message: validationRules.first_name.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.first_name && <span className="text-error text-sm mt-1">{errors.first_name.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Middle Name</label>
              <input
                type="text"
                {...register("middle_name", {
                  pattern: {
                    value: validationRules.middle_name.pattern,
                    message: validationRules.middle_name.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.middle_name && <span className="text-error text-sm mt-1">{errors.middle_name.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Last Name</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("last_name", {
                  required: "Last Name is required",
                  pattern: {
                    value: validationRules.last_name.pattern,
                    message: validationRules.last_name.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.last_name && <span className="text-error text-sm mt-1">{errors.last_name.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Email</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: validationRules.email.pattern,
                    message: validationRules.email.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.email && <span className="text-error text-sm mt-1">{errors.email.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Phone No</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("phone_no", {
                  required: "Phone No is required",
                  pattern: {
                    value: validationRules.phone_no.pattern,
                    message: validationRules.phone_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.phone_no && <span className="text-error text-sm mt-1">{errors.phone_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Gender</label>
                <span className="text-error">*</span>
              </div>
              <select
                {...register("gender", { required: "Gender is required" })}
                className="input input-bordered w-full"
              >
                <option value="">Select Gender</option>
                <option value="Male">Female</option>
                <option value="Female">Male</option>
              </select>
              {errors.gender && <span className="text-error text-sm mt-1">{errors.gender.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Aadhaar No</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("adhaar_no", {
                  required: "Aadhaar No is required",
                  pattern: {
                    value: validationRules.adhaar_no.pattern,
                    message: validationRules.adhaar_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.adhaar_no && <span className="text-error text-sm mt-1">{errors.adhaar_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">PAN No</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("pan_no", {
                  required: "PAN No is required",
                  pattern: {
                    value: validationRules.pan_no.pattern,
                    message: validationRules.pan_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.pan_no && <span className="text-error text-sm mt-1">{errors.pan_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Qualification</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("qualification", {
                  required: "Qualification is required",
                  pattern: {
                    value: validationRules.qualification.pattern,
                    message: validationRules.qualification.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.qualification && <span className="text-error text-sm mt-1">{errors.qualification.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Joining Date</label>
              </div>
              <input
                type="date"
                {...register("joining_date")}
                className="input input-bordered w-full cursor-not-allowed bg-gray-100 dark:bg-gray-700"
                readOnly
              />
            </div>
            {/* Banking Fields */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Account No</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("banking_data.account_no", {
                  required: "Account No is required",
                  pattern: {
                    value: validationRules.account_no.pattern,
                    message: validationRules.account_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.banking_data?.account_no && <span className="text-error text-sm mt-1">{errors.banking_data.account_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">IFSC Code</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("banking_data.ifsc_code", {
                  required: "IFSC Code is required",
                  pattern: {
                    value: validationRules.ifsc_code.pattern,
                    message: validationRules.ifsc_code.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.banking_data?.ifsc_code && <span className="text-error text-sm mt-1">{errors.banking_data.ifsc_code.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Holder Name</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("banking_data.holder_name", {
                  required: "Holder Name is required",
                  pattern: {
                    value: validationRules.holder_name.pattern,
                    message: validationRules.holder_name.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.banking_data?.holder_name && <span className="text-error text-sm mt-1">{errors.banking_data.holder_name.message}</span>}
            </div>

            {/* Address Fields */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">House No</label>
              </div>
              <input
                type="text"
                {...register("address_data.house_no", {
                  pattern: {
                    value: validationRules.house_no.pattern,
                    message: validationRules.house_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.house_no && <span className="text-error text-sm mt-1">{errors.address_data.house_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Habitation</label>
              </div>
              <input
                type="text"
                {...register("address_data.habitation", {
                  pattern: {
                    value: validationRules.habitation.pattern,
                    message: validationRules.habitation.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.habitation && <span className="text-error text-sm mt-1">{errors.address_data.habitation.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Ward No</label>
              <input
                type="text"
                {...register("address_data.ward_no", {
                  pattern: {
                    value: validationRules.ward_no.pattern,
                    message: validationRules.ward_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.ward_no && <span className="text-error text-sm mt-1">{errors.address_data.ward_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Zone No</label>
              <input
                type="text"
                {...register("address_data.zone_no", {
                  pattern: {
                    value: validationRules.zone_no.pattern,
                    message: validationRules.zone_no.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.zone_no && <span className="text-error text-sm mt-1">{errors.address_data.zone_no.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Block</label>
              <input
                type="text"
                {...register("address_data.block", {
                  pattern: {
                    value: validationRules.block.pattern,
                    message: validationRules.block.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.block && <span className="text-error text-sm mt-1">{errors.address_data.block.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">District</label>
              <input
                type="text"
                {...register("address_data.district", {
                  pattern: {
                    value: validationRules.district.pattern,
                    message: validationRules.district.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.district && <span className="text-error text-sm mt-1">{errors.address_data.district.message}</span>}
            </div>

            <div className="flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Division</label>
              <input
                type="text"
                {...register("address_data.division", {
                  pattern: {
                    value: validationRules.division.pattern,
                    message: validationRules.division.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.division && <span className="text-error text-sm mt-1">{errors.address_data.division.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Area Code</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("address_data.area_code", {
                  pattern: {
                    value: validationRules.area_code.pattern,
                    message: validationRules.area_code.message
                  }
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.area_code && <span className="text-error text-sm mt-1">{errors.address_data.area_code.message}</span>}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Address Line</label>
                <span className="text-error">*</span>
              </div>
              <input
                type="text"
                {...register("address_data.address_line", {
                  required: "Address Line is required",
                  pattern: {
                    value: validationRules.address_line.pattern,
                    message: validationRules.address_line.message,
                  },
                })}
                className="input input-bordered w-full"
              />
              {errors.address_data?.address_line && (
                <span className="text-error text-sm mt-1">
                  {errors.address_data.address_line.message}
                </span>
              )}
            </div>

            {/* Country, State, City */}
            {/* COUNTRY */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">Country</label>
                <span className="text-error">*</span>
              </div>
              <select
                {...register("address_data.country", { required: "Country is required" })}
                className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer capitalize"
                value={countryVal || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setValue("address_data.country", val, { shouldValidate: true });
                  trigger("address_data.country");
                }}
              >
                <option value="">Select Country</option>
                {[...countries]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {errors.address_data?.country && (
                <span className="text-error text-sm mt-1">{errors.address_data.country.message}</span>
              )}
            </div>

            {/* STATE */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">State</label>
                <span className="text-error">*</span>
              </div>
              <select
                {...register("address_data.state", { required: "State is required" })}
                className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer capitalize"
                value={stateVal || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setValue("address_data.state", val, { shouldValidate: true });
                  trigger("address_data.state");
                }}
              >
                <option value="">Select State</option>
                {[...states]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              {errors.address_data?.state && (
                <span className="text-error text-sm mt-1">{errors.address_data.state.message}</span>
              )}
            </div>

            {/* CITY */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <label className="label text-gray-700 dark:text-gray-300">City</label>
                <span className="text-error">*</span>
              </div>
              <select
                {...register("address_data.city", { required: "City is required" })}
                className="select select-bordered w-full bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer capitalize"
                value={cityVal || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setValue("address_data.city", val, { shouldValidate: true });
                  trigger("address_data.city");
                }}
              >
                <option value="">Select City</option>
                {[...cities]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {errors.address_data?.city && (
                <span className="text-error text-sm mt-1">{errors.address_data.city.message}</span>
              )}
            </div>


            {/* Profile Picture */}
            <div className="md:col-span-2 lg:col-span-3 flex flex-col">
              <label className="label text-gray-700 dark:text-gray-300">Profile Picture</label>
              <input
                type="file"
                {...register("user_profile")}
                className="file-input file-input-bordered w-full"
              />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center mt-6">
              {/* <button type="submit" className="btn bgTheme text-white w-52">Save Changes</button> */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-6 flex justify-center">
                <button
                  type="submit"
                  className="btn bgTheme btn-primary w-52 flex justify-center items-center text-white"
                  disabled={submitting}
                >
                  {submitting ? (
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                  ) : (
                    <></>
                  )}
                  {submitting ? "" : "Save Changes"}
                </button>
              </div>

            </div>
          </form>

        </div>
      </div>

      {updateModal && (
        <UpdateSuccessful
          handleCloseOnly={() => setUpdateModal(false)}
          handleCloseAndNavigate={() => navigate(`/staffDetail/${type}/${id}`)}
        />
      )}

      {/* Error Modal */}
      {formErrors.length > 0 && (
        <dialog className="modal modal-open">
          <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Update Failed</h3>
            <div className="py-4">
              {formErrors.map((err, idx) => (
                <p key={idx} className="text-sm">
                  {err}
                </p>
              ))}
            </div>
            <div className="modal-action">
              <button
                className="btn bgTheme text-white w-30"
                onClick={() => setFormErrors([])}
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

export default UpdateStaffDetails;