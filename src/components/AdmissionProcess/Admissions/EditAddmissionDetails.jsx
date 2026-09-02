import React, { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchAdmissionDetailsById,
  fetchCity,
  fetchCountry,
  fetchGuardianType,
  fetchSchoolYear,
  fetchState,
  fetchYearLevels,
  fetchBankNames,
  addBankName,
  handleEditAdmissionForm,
} from "../../../services/api/Api";
import { constants } from "../../../global/constants";
import AdmissionEditedSuccessfully from "../../Modals/AdmissionEditedSuccessfully";

export const EditAddmissionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [yearLevel, setYearLevel] = useState([]);
  const [schoolYears, setSchoolYear] = useState([]);
  const [guardianTypes, setGuardianType] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedGuardianType, setSelectedGuardianType] = useState("");
  const [country, setCountry] = useState([]);
  const [state, setState] = useState([]);
  const [city, setCity] = useState([]);
  const [formData, setFormData] = useState(null);
  const [isRTE, setIsRTE] = useState(false);
  const [showEditSuccessModal, setShowEditSuccessModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const formRef = useRef(null);

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState("");
  const [citySearchInput, setCitySearchInput] = useState("");

  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [selectedStateName, setSelectedStateName] = useState("");
  const [stateSearchInput, setStateSearchInput] = useState("");

  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountryName, setSelectedCountryName] = useState("");
  const [countrySearchInput, setCountrySearchInput] = useState("");

  const [bankNames, setBankNames] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const bankInputRef = useRef(null);
  const [creatingBank, setCreatingBank] = useState(false);
  const [createBankError, setCreateBankError] = useState("");
  const [bankQuery, setBankQuery] = useState("");

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, dirtyFields },
    setValue,
    resetField,
    trigger,
    getValues,
  } = useForm({
    mode: "onChange",
    defaultValues: {
      student: {
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        father_name: "",
        mother_name: "",
        date_of_birth: "",
        gender: "",
        religion: "",
        category: null,
        height: null,
        weight: null,
        blood_group: "",
        number_of_siblings: "",
        scholar_number: "",
        aadhaar_number: "",
        FMID_number: "",
        apaar_number: "",
        PEN_number: "",
        BPL_number: "",
        SSSMID: "",
        is_active: "",
      },
      guardian: {
        first_name: "",
        middle_name: "",
        last_name: "",
        email: "",
        phone_no: "",
        annual_income: null,
        means_of_livelihood: "",
        qualification: "",
        occupation: "",
        designation: "",
      },
      address_input: {
        house_no: "",
        habitation: "",
        ward_no: "",
        zone_no: "",
        block: "",
        district: "",
        division: "",
        area_code: "",
        country: "",
        state: "",
        city: "",
        address_line: "",
      },
      banking_detail_input: {
        account_no: "",
        ifsc_code: "",
        holder_name: "",
        bank_name: "",
      },
      guardian_type_input: null,
      year_level: "",
      school_year: "",
      class_section: "",
      admission_date: "",
      previous_school_name: "",
      previous_standard_studied: "",
      tc_letter: "",
      emergency_contact_no: "",
      entire_road_distance_from_home_to_school: "",
      obtain_marks: "",
      total_marks: "",
      previous_percentage: "",
      is_rte: false,
      rte_number: "",
      enrollment_no: "",
    },
  });

  // Helper function to check if any bank field is filled
  const checkIfAnyBankFieldFilled = () => {
    const values = getValues();
    const bankingDetail = values.banking_detail_input || {};

    return (
      bankingDetail.holder_name?.trim() ||
      bankingDetail.bank_name ||
      bankingDetail.ifsc_code?.trim() ||
      bankingDetail.account_no?.toString().trim()
    );
  };

  // Re-validate bank fields when any bank field changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name?.includes("banking_detail_input")) {
        trigger([
          "banking_detail_input.holder_name",
          "banking_detail_input.bank_name",
          "banking_detail_input.account_no",
          "banking_detail_input.ifsc_code",
        ]);
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, trigger]);

  // Bank name handling functions
  useEffect(() => {
    const getBankNames = async () => {
      try {
        const res = await fetchBankNames();
        const sortedBanks = res
          .map((b) => ({ id: b.id, name: b.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setBankNames(sortedBanks);
        setFilteredBanks(sortedBanks);
      } catch (err) {
        console.error("Failed to fetch bank names:", err);
      }
    };
    getBankNames();
  }, []);

  const selectedBankId = watch("banking_detail_input.bank_name");

  useEffect(() => {
    if (selectedBankId && bankNames.length > 0) {
      const selectedBankObject = bankNames.find(
        (b) => String(b.id) === String(selectedBankId)
      );
      if (selectedBankObject) {
        setBankQuery(selectedBankObject.name);
      }
    } else if (!selectedBankId) {
      setBankQuery("");
    }
  }, [selectedBankId, bankNames]);

  const handleBankInputChange = (e) => {
    const value = e.target.value;
    setBankQuery(value);

    if (!value.trim()) {
      setFilteredBanks(bankNames);
      setValue("banking_detail_input.bank_name", "", {
        shouldValidate: true,
        shouldDirty: true,
      });
      setShowDropdown(true);
      return;
    }

    const filtered = bankNames.filter((b) =>
      b.name.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredBanks(filtered);
    setShowDropdown(true);
  };

  const handleSelectBank = (bank) => {
    setValue("banking_detail_input.bank_name", bank.id.toString(), {
      shouldValidate: true,
      shouldDirty: true,
    });
    setBankQuery(bank.name);
    setShowDropdown(false);
  };

  const handleCreateBank = async () => {
    const raw = (bankQuery || "").trim().replace(/\s+/g, " ");
    if (!raw) return;

    const existing = bankNames.find(
      (b) => b.name.toLowerCase() === raw.toLowerCase()
    );
    if (existing) {
      handleSelectBank(existing);
      return;
    }

    try {
      setCreatingBank(true);
      setCreateBankError("");
      const res = await addBankName({ name: raw });
      const saved = {
        id: res?.id ?? res?.data?.id,
        name: res?.name ?? res?.data?.name ?? raw,
      };
      if (!saved.id) throw new Error("New bank id not returned from API");

      const updated = [...bankNames, saved].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setBankNames(updated);
      setFilteredBanks(updated);
      handleSelectBank(saved);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to add bank.";
      setCreateBankError(msg);
    } finally {
      setCreatingBank(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bankInputRef.current &&
        !bankInputRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGuardianTypeChange = (e) => {
    setSelectedGuardianType(e.target.value);
    setValue("guardian_type_input", e.target.value);
  };

  const handleRTECheckboxChange = (e) => {
    const isChecked = e.target.checked;
    setIsRTE(isChecked);
    setValue("is_rte", isChecked);

    if (!isChecked) {
      resetField("rte_number");
    }
  };

  // Data fetching functions
  const getYearLevels = async () => {
    try {
      const yearLevels = await fetchYearLevels();
      setYearLevel(yearLevels);
    } catch (err) {
      console.log("Failed to load year levels. Please try again.");
    }
  };

  const getSchoolYears = async () => {
    try {
      const schoolYears = await fetchSchoolYear();
      setSchoolYear(schoolYears);
    } catch (err) {
      console.log("Failed to load school years. Please try again.");
    }
  };

  const getGuardianType = async () => {
    try {
      const guardianType = await fetchGuardianType();
      setGuardianType(guardianType);
    } catch (error) {
      console.log("Failed to load guardian type. Please try again.");
    }
  };

  const getCountry = async () => {
    try {
      const countryList = await fetchCountry();
      setCountry(countryList);
    } catch (err) {
      console.log("Failed to load countries. Please try again.");
    }
  };

  const getState = async () => {
    try {
      const stateList = await fetchState();
      setState(stateList);
    } catch (err) {
      console.log("Failed to load states. Please try again.");
    }
  };

  const getCity = async () => {
    try {
      const cityList = await fetchCity();
      setCity(cityList);
    } catch (err) {
      console.log("Failed to load cities. Please try again.");
    }
  };

  const getAdmissionData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchAdmissionDetailsById(id);
      if (!response) {
        throw new Error("No response received from API");
      }

      // Fetch location data
      const countries = await fetchCountry();
      const states = await fetchState();
      const cities = await fetchCity();

      // Initialize location variables with null values
      let countryObj = null;
      let stateObj = null;
      let cityObj = null;
      let selectedCountryName = "";
      let selectedStateName = "";
      let selectedCityName = "";

      // Check if address exists and has location data
      if (response.address) {
        // Safely get country
        if (response.address.country_name) {
          countryObj = countries.find(
            (c) => c.name === response.address.country_name
          );
          selectedCountryName =
            countryObj?.name || response.address.country_name || "";
        }

        // Safely get state
        if (response.address.state_name) {
          stateObj = states.find((s) => s.name === response.address.state_name);
          selectedStateName =
            stateObj?.name || response.address.state_name || "";
        }

        // Safely get city
        if (response.address.city_name) {
          cityObj = cities.find((c) => c.name === response.address.city_name);
          selectedCityName = cityObj?.name || response.address.city_name || "";
        }
      }

      const transformedData = {
        ...response,
        student: response.student_input || {},
        guardian: response.guardian_input || {},
        address: response.address
          ? {
            ...response.address,
            country: countryObj?.id || null,
            state: stateObj?.id || null,
            city: cityObj?.id || null,
            country_name: response.address.country_name || "",
            state_name: response.address.state_name || "",
            city_name: response.address.city_name || "",
          }
          : null,
        banking_detail: response.banking_detail || null,
        guardian_type: response.guardian_type || "",
      };

      setFormData(transformedData);
      setSelectedGuardianType(response.guardian_type || "");
      setIsRTE(response.is_rte || false);

      // Set selected names for dropdown display
      setSelectedCountryName(selectedCountryName);
      setSelectedStateName(selectedStateName);
      setSelectedCityName(selectedCityName);

      // Set all form values
      const setFormValues = (data) => {
        // Student fields
        if (data.student_input) {
          Object.entries(data.student_input).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              setValue(`student.${key}`, value);
            }
          });
        }

        // Guardian fields
        if (data.guardian_input) {
          Object.entries(data.guardian_input).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              setValue(`guardian.${key}`, value);
            }
          });
        }

        // Address fields - only if address exists
        if (data.address) {
          Object.entries(data.address).forEach(([key, value]) => {
            if (
              value !== null &&
              value !== undefined &&
              key !== "country_name" &&
              key !== "state_name" &&
              key !== "city_name"
            ) {
              setValue(`address_input.${key}`, value);
            }
          });

          // Set location IDs if found
          if (countryObj) {
            setValue("address_input.country", countryObj.id);
          }
          if (stateObj) {
            setValue("address_input.state", stateObj.id);
          }
          if (cityObj) {
            setValue("address_input.city", cityObj.id);
          }
        }

        // Banking details
        if (data.banking_detail) {
          Object.entries(data.banking_detail).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              setValue(`banking_detail_input.${key}`, value);
            }
          });
        }

        // Other fields
        const fieldMappings = {
          year_level: "year_level",
          school_year: "school_year",
          class_section: "class_section",
          admission_date: "admission_date",
          previous_school_name: "previous_school_name",
          previous_standard_studied: "previous_standard_studied",
          tc_letter: "tc_letter",
          emergency_contact_no: "emergency_contact_no",
          entire_road_distance_from_home_to_school:
            "entire_road_distance_from_home_to_school",
          obtain_marks: "obtain_marks",
          total_marks: "total_marks",
          previous_percentage: "previous_percentage",
          is_rte: "is_rte",
          rte_number: "rte_number",
          enrollment_no: "enrollment_no",
        };

        Object.entries(fieldMappings).forEach(([apiField, formField]) => {
          if (data[apiField] !== null && data[apiField] !== undefined) {
            setValue(formField, data[apiField]);
          }
        });

        // Guardian type
        if (data.guardian_type) {
          setValue("guardian_type_input", data.guardian_type);
          setSelectedGuardianType(data.guardian_type);
        }
      };

      setFormValues(response);
    } catch (error) {
      console.error("Error fetching admission details:", error);
      setError(true);
      setAlertMessage(`Failed to load admission details: ${error.message}`);
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  }, [id, setValue]);

  useEffect(() => {
    getYearLevels();
    getSchoolYears();
    getGuardianType();
    getCountry();
    getState();
    getCity();
    getAdmissionData();
  }, [id, getAdmissionData]);

  const handleCloseOnly = () => {
    setShowEditSuccessModal(false);
  };

  const handleCloseAndNavigate = () => {
    setShowEditSuccessModal(false);
    navigate("/addmissionDetails");
  };

  // 🔥 FIXED: Address fields are optional now
  useEffect(() => {
    register("address_input.country");
    register("address_input.state");
    register("address_input.city");
  }, [register]);


  // 🔥 REAL-TIME AUTO-CALCULATION - EXACTLY LIKE ADMISSION FORM
  const obtainMarks = watch("obtain_marks");
  const totalMarks = watch("total_marks");

  useEffect(() => {
    const obtain = parseFloat(obtainMarks);
    const total = parseFloat(totalMarks);

    if (!isNaN(obtain) && !isNaN(total) && total > 0) {
      const percentage = (obtain / total) * 100;
      const rounded = Math.round(percentage * 100) / 100;
      setValue("previous_percentage", rounded, { shouldValidate: true });
    } else {
      setValue("previous_percentage", "", { shouldValidate: true });
    }
  }, [obtainMarks, totalMarks, setValue]);


  //   const onSubmit = async (data) => {
  //   setLoading(true);

  //   // ----- Helper functions (keep these as they are) -----
  //   const handleOptionalField = (value) => {
  //     if (value === "" || value === undefined || value === null) return null;
  //     return value;
  //   };

  //   const handleOptionalNumber = (value) => {
  //     if (value === "" || value === undefined || value === null) return null;
  //     const num = parseFloat(value);
  //     return isNaN(num) ? null : num;
  //   };

  //   const handleOptionalInteger = (value) => {
  //     if (value === "" || value === undefined || value === null) return null;
  //     const num = parseInt(value, 10);
  //     return isNaN(num) ? null : num;
  //   };

  //   const handleDateField = (value) => {
  //     if (!value) return null;
  //     try {
  //       const date = new Date(value);
  //       if (isNaN(date.getTime())) return null;
  //       return date.toISOString().split("T")[0];
  //     } catch {
  //       return null;
  //     }
  //   };

  //   // ----- पूरा transformedData (सभी फ़ील्ड्स) -----
  //   const transformedData = {
  //     student: {
  //       first_name: data.student.first_name || "",
  //       middle_name: handleOptionalField(data.student.middle_name),
  //       last_name: handleOptionalField(data.student.last_name),
  //       email: data.student.email || "",
  //       father_name: handleOptionalField(data.student.father_name),
  //       mother_name: handleOptionalField(data.student.mother_name),
  //       date_of_birth: handleDateField(data.student.date_of_birth),
  //       gender: handleOptionalField(data.student.gender),
  //       religion: handleOptionalField(data.student.religion),
  //       category: handleOptionalField(data.student.category),
  //       height: handleOptionalNumber(data.student.height),
  //       weight: handleOptionalNumber(data.student.weight),
  //       blood_group: handleOptionalField(data.student.blood_group),
  //       number_of_siblings: handleOptionalInteger(data.student.number_of_siblings) || 0,
  //       scholar_number: handleOptionalField(data.student.scholar_number),
  //       aadhaar_number: handleOptionalField(data.student.aadhaar_number),
  //       FMID_number: handleOptionalField(data.student.FMID_number),
  //       apaar_number: handleOptionalField(data.student.apaar_number),
  //       PEN_number: handleOptionalField(data.student.PEN_number),
  //       BPL_number: handleOptionalField(data.student.BPL_number),
  //       SSSMID: handleOptionalField(data.student.SSSMID),
  //       class_section: handleOptionalField(data.class_section),
  //       is_active: data.student.is_active || "true",
  //     },
  //     guardian: {
  //       first_name: handleOptionalField(data.guardian.first_name),
  //       middle_name: handleOptionalField(data.guardian.middle_name),
  //       last_name: handleOptionalField(data.guardian.last_name),
  //       email: handleOptionalField(data.guardian.email),
  //       phone_no: handleOptionalField(data.guardian.phone_no),
  //       annual_income: handleOptionalNumber(data.guardian.annual_income) || null,
  //       means_of_livelihood: data.guardian.means_of_livelihood ? data.guardian.means_of_livelihood : null,
  //       qualification: handleOptionalField(data.guardian.qualification),
  //       occupation: handleOptionalField(data.guardian.occupation),
  //       designation: handleOptionalField(data.guardian.designation),
  //     },
  //     address_input: {
  //       house_no: handleOptionalInteger(data.address_input.house_no),
  //       habitation: handleOptionalField(data.address_input.habitation),
  //       ward_no: handleOptionalInteger(data.address_input.ward_no),
  //       zone_no: handleOptionalInteger(data.address_input.zone_no),
  //       block: handleOptionalField(data.address_input.block),
  //       district: handleOptionalField(data.address_input.district),
  //       division: handleOptionalField(data.address_input.division),
  //       area_code: handleOptionalInteger(data.address_input.area_code),
  //       country: handleOptionalField(data.address_input.country),
  //       state: handleOptionalField(data.address_input.state),
  //       city: handleOptionalField(data.address_input.city),
  //       address_line: handleOptionalField(data.address_input.address_line),
  //     },
  //     banking_detail_input: {
  //       account_no: handleOptionalInteger(data.banking_detail_input.account_no),
  //       ifsc_code: handleOptionalField(data.banking_detail_input.ifsc_code),
  //       holder_name: handleOptionalField(data.banking_detail_input.holder_name),
  //       bank_name: handleOptionalField(data.banking_detail_input.bank_name),
  //     },
  //     guardian_type_input: handleOptionalField(data.guardian_type_input),
  //     year_level: handleOptionalField(data.year_level),
  //     school_year: handleOptionalField(data.school_year),
  //     admission_date: handleDateField(data.admission_date),
  //     previous_school_name: handleOptionalField(data.previous_school_name),
  //     previous_standard_studied: handleOptionalField(data.previous_standard_studied),
  //     tc_letter: handleOptionalField(data.tc_letter),
  //     emergency_contact_no: handleOptionalField(data.emergency_contact_no),
  //     entire_road_distance_from_home_to_school: handleOptionalField(data.entire_road_distance_from_home_to_school),
  //     obtain_marks: handleOptionalNumber(data.obtain_marks),
  //     total_marks: handleOptionalNumber(data.total_marks),
  //     previous_percentage: handleOptionalNumber(data.previous_percentage),
  //     is_rte: data.is_rte || false,
  //     rte_number: data.is_rte ? handleOptionalField(data.rte_number) : null,
  //     enrollment_no: handleOptionalField(data.enrollment_no),
  //   };

  //   // 🔥 FIX: Get dirty values but exclude admission_date unless explicitly changed
  //   const getDirtyValues = (dirtyFieldsObj, allValuesObj) => {
  //     if (!dirtyFieldsObj || !allValuesObj) return {};

  //     const result = {};
  //     Object.keys(dirtyFieldsObj).forEach(key => {
  //       const dirtyValue = dirtyFieldsObj[key];
  //       const allValue = allValuesObj[key];

  //       // 🔥 Skip admission_date if it's the only field or if it hasn't been manually changed
  //       // We'll handle this separately
  //       if (key === 'admission_date' && !dirtyFieldsObj['admission_date']) {
  //         return;
  //       }

  //       if (typeof dirtyValue === 'object' && !Array.isArray(dirtyValue)) {
  //         if (allValue && typeof allValue === 'object' && !Array.isArray(allValue)) {
  //           const nested = getDirtyValues(dirtyValue, allValue);
  //           if (Object.keys(nested).length > 0) {
  //             result[key] = nested;
  //           }
  //         }
  //       } else if (dirtyValue === true) {
  //         // Only include if value is not undefined, null, or empty string
  //         if (allValue !== undefined && allValue !== null && allValue !== "") {
  //           result[key] = allValue;
  //         }
  //       }
  //     });

  //     return result;
  //   };

  //   // Get only fields that were actually changed, but EXCLUDE admission_date
  //   let dirtyTransformed = getDirtyValues(dirtyFields, transformedData);

  //   // 🔥 CRITICAL FIX: Remove admission_date if it's the only field changed or if it wasn't manually changed
  //   // We need to check if admission_date was the only field changed
  //   const dirtyKeys = Object.keys(dirtyTransformed);

  //   // If admission_date is in dirty fields but it's the only field, remove it
  //   if (dirtyKeys.length === 1 && dirtyKeys[0] === 'admission_date') {
  //     dirtyTransformed = {};
  //   }

  //   // Check if admission_date is in dirty fields and it wasn't actually changed by user
  //   // We can check if the admission_date in dirtyFields is actually present
  //   if (dirtyTransformed.admission_date) {
  //     // Only keep admission_date if it was explicitly changed by user
  //     // You can add additional logic here if needed
  //   }

  //   // If no fields were changed (or only admission_date was changed)
  //   if (Object.keys(dirtyTransformed).length === 0) {
  //     setAlertMessage("No changes were made to update.");
  //     setShowAlert(true);
  //     setLoading(false);
  //     return;
  //   }

  //   // ----- Create FormData from dirty fields only -----
  //   const submitFormData = new FormData();

  //   const appendToFormData = (obj, prefix = '') => {
  //     Object.entries(obj).forEach(([key, value]) => {
  //       const fullKey = prefix ? `${prefix}[${key}]` : key;

  //       // 🔥 Skip admission_date if it's being sent but wasn't changed
  //       if (fullKey === 'admission_date') {
  //         // Check if the field was actually changed by comparing with original data
  //         // You can skip sending admission_date altogether for updates
  //         // unless it was explicitly changed
  //         return;
  //       }

  //       if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
  //         if (Object.keys(value).length > 0) {
  //           appendToFormData(value, fullKey);
  //         }
  //       } else if (value !== null && value !== undefined && value !== "") {
  //         submitFormData.append(fullKey, value);
  //       }
  //     });
  //   };

  //   appendToFormData(dirtyTransformed);

  //   // Debug log - Check what's being sent
  //   console.log("🚀 Fields being updated:");
  //   for (let pair of submitFormData.entries()) {
  //     console.log(pair[0] + ': ' + pair[1]);
  //   }

  //   // ----- API Call -----
  //   try {
  //     await handleEditAdmissionForm(submitFormData, id);
  //     setShowEditSuccessModal(true);
  //     // Refresh data after successful update
  //     await getAdmissionData();
  //   } catch (error) {
  //     console.error("Update error:", error.response?.data || error.message);
  //     setAlertMessage(
  //       `Failed to update the form: ${error.response?.data?.message || error.message}`
  //     );
  //     setShowAlert(true);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const getBackendErrorMessage = (error) => {
    const data = error?.response?.data;

    if (!data) return error?.message || "Something went wrong. Please try again.";
    if (typeof data === "string") return data;
    if (typeof data.message === "string") return data.message;
    if (typeof data.detail === "string") return data.detail;

    const messages = [];
    const collectMessages = (obj, prefix = "") => {
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          if (typeof item === "string") messages.push(prefix ? `${prefix}: ${item}` : item);
          else if (item && typeof item === "object") collectMessages(item, prefix);
        });
      } else if (obj && typeof obj === "object") {
        Object.entries(obj).forEach(([key, value]) => {
          collectMessages(value, prefix ? `${prefix} > ${key}` : key);
        });
      } else if (typeof obj === "string") {
        messages.push(prefix ? `${prefix}: ${obj}` : obj);
      }
    };
    collectMessages(data);

    return messages.length > 0 ? messages.join("\n") : error?.message || "Something went wrong. Please try again.";
  };



  const onSubmit = async (data) => {
    setLoading(true);

    // ----- Helper functions -----
    const handleOptionalField = (value) => {
      if (value === "" || value === undefined || value === null) return null;
      return value;
    };

    const handleOptionalNumber = (value) => {
      if (value === "" || value === undefined || value === null) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    const handleOptionalInteger = (value) => {
      if (value === "" || value === undefined || value === null) return null;
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    };

    const handleDateField = (value) => {
      if (!value) return null;
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) return null;
        return date.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };

    // ----- पूरा transformedData (सभी फ़ील्ड्स) -----
    const transformedData = {
      student: {
        first_name: data.student.first_name || "",
        middle_name: handleOptionalField(data.student.middle_name),
        last_name: handleOptionalField(data.student.last_name),
        email: data.student.email || "",
        father_name: handleOptionalField(data.student.father_name),
        mother_name: handleOptionalField(data.student.mother_name),
        date_of_birth: handleDateField(data.student.date_of_birth),
        gender: handleOptionalField(data.student.gender),
        religion: handleOptionalField(data.student.religion),
        category: handleOptionalField(data.student.category),
        height: handleOptionalNumber(data.student.height),
        weight: handleOptionalNumber(data.student.weight),
        blood_group: handleOptionalField(data.student.blood_group),
        number_of_siblings: handleOptionalInteger(data.student.number_of_siblings) || 0,
        scholar_number: handleOptionalField(data.student.scholar_number),
        aadhaar_number: handleOptionalField(data.student.aadhaar_number),
        FMID_number: handleOptionalField(data.student.FMID_number),
        apaar_number: handleOptionalField(data.student.apaar_number),
        PEN_number: handleOptionalField(data.student.PEN_number),
        BPL_number: handleOptionalField(data.student.BPL_number),
        SSSMID: handleOptionalField(data.student.SSSMID),
        is_active: data.student.is_active || "true",
        // ❌ REMOVE class_section from here
      },
      guardian: {
        first_name: handleOptionalField(data.guardian.first_name),
        middle_name: handleOptionalField(data.guardian.middle_name),
        last_name: handleOptionalField(data.guardian.last_name),
        email: handleOptionalField(data.guardian.email),
        phone_no: handleOptionalField(data.guardian.phone_no),
        annual_income: handleOptionalNumber(data.guardian.annual_income) || null,
        means_of_livelihood: data.guardian.means_of_livelihood ? data.guardian.means_of_livelihood : null,
        qualification: handleOptionalField(data.guardian.qualification),
        occupation: handleOptionalField(data.guardian.occupation),
        designation: handleOptionalField(data.guardian.designation),
      },
      address_input: {
        house_no: handleOptionalInteger(data.address_input.house_no),
        habitation: handleOptionalField(data.address_input.habitation),
        ward_no: handleOptionalInteger(data.address_input.ward_no),
        zone_no: handleOptionalInteger(data.address_input.zone_no),
        block: handleOptionalField(data.address_input.block),
        district: handleOptionalField(data.address_input.district),
        division: handleOptionalField(data.address_input.division),
        area_code: handleOptionalInteger(data.address_input.area_code),
        country: handleOptionalField(data.address_input.country),
        state: handleOptionalField(data.address_input.state),
        city: handleOptionalField(data.address_input.city),
        address_line: handleOptionalField(data.address_input.address_line),
      },
      banking_detail_input: {
        account_no: handleOptionalInteger(data.banking_detail_input.account_no),
        ifsc_code: handleOptionalField(data.banking_detail_input.ifsc_code),
        holder_name: handleOptionalField(data.banking_detail_input.holder_name),
        bank_name: handleOptionalField(data.banking_detail_input.bank_name),
      },
      guardian_type_input: handleOptionalField(data.guardian_type_input),
      year_level: handleOptionalField(data.year_level),
      school_year: handleOptionalField(data.school_year),
      // ✅ MOVED class_section HERE (top level)
      class_section: handleOptionalField(data.class_section),
      admission_date: handleDateField(data.admission_date),
      previous_school_name: handleOptionalField(data.previous_school_name),
      previous_standard_studied: handleOptionalField(data.previous_standard_studied),
      tc_letter: handleOptionalField(data.tc_letter),
      emergency_contact_no: handleOptionalField(data.emergency_contact_no),
      entire_road_distance_from_home_to_school: handleOptionalField(data.entire_road_distance_from_home_to_school),
      obtain_marks: handleOptionalNumber(data.obtain_marks),
      total_marks: handleOptionalNumber(data.total_marks),
      previous_percentage: handleOptionalNumber(data.previous_percentage),
      is_rte: data.is_rte || false,
      rte_number: data.is_rte ? handleOptionalField(data.rte_number) : null,
      enrollment_no: handleOptionalField(data.enrollment_no),
    };

    // ----- Get dirty values from nested structure -----
    const getDirtyValues = (dirtyFieldsObj, allValuesObj) => {
      if (!dirtyFieldsObj || !allValuesObj) return {};

      const result = {};
      Object.keys(dirtyFieldsObj).forEach(key => {
        const dirtyValue = dirtyFieldsObj[key];
        const allValue = allValuesObj[key];

        if (key === 'admission_date' && !dirtyFieldsObj['admission_date']) {
          return;
        }

        if (typeof dirtyValue === 'object' && !Array.isArray(dirtyValue)) {
          if (allValue && typeof allValue === 'object' && !Array.isArray(allValue)) {
            const nested = getDirtyValues(dirtyValue, allValue);
            if (Object.keys(nested).length > 0) {
              result[key] = nested;
            }
          }
        } else if (dirtyValue === true) {
          if (allValue !== undefined && allValue !== null && allValue !== "") {
            result[key] = allValue;
          }
        }
      });

      return result;
    };

    // Get only fields that were actually changed
    let dirtyTransformed = getDirtyValues(dirtyFields, transformedData);

    // Remove admission_date if it's the only field changed
    const dirtyKeys = Object.keys(dirtyTransformed);
    if (dirtyKeys.length === 1 && dirtyKeys[0] === 'admission_date') {
      dirtyTransformed = {};
    }

    // If no fields were changed
    if (Object.keys(dirtyTransformed).length === 0) {
      setAlertMessage("No changes were made to update.");
      setShowAlert(true);
      setLoading(false);
      return;
    }

    // ----- Create FormData from dirty fields only -----
    const submitFormData = new FormData();

    const appendToFormData = (obj, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}[${key}]` : key;

        if (fullKey === 'admission_date') {
          return;
        }

        if (value && typeof value === 'object' && !Array.isArray(value) && value !== null) {
          if (Object.keys(value).length > 0) {
            appendToFormData(value, fullKey);
          }
        } else if (value !== null && value !== undefined && value !== "") {
          submitFormData.append(fullKey, value);
        }
      });
    };

    appendToFormData(dirtyTransformed);

    // Debug log - Check what's being sent
    console.log("🚀 Fields being updated:");
    for (let pair of submitFormData.entries()) {
      console.log(pair[0] + ': ' + pair[1]);
    }

    // ----- API Call -----
    try {
      await handleEditAdmissionForm(submitFormData, id);
      setShowEditSuccessModal(true);
      await getAdmissionData();
      // } catch (error) {
      //   console.error("Update error:", error.response?.data || error.message);
      //   setAlertMessage(
      //     `Failed to update the form: ${error.response?.data?.message || error.message}`
      //   );
      //   setShowAlert(true);
      // } finally {
      //   setLoading(false);
      // }
    } catch (error) {
      console.error("Update error:", error.response?.data || error.message);
      setAlertMessage(getBackendErrorMessage(error));
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };
  const filteredCities = city
    .filter((c) => c.name.toLowerCase().includes(citySearchInput.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredStates = state
    .filter((s) =>
      s.name.toLowerCase().includes(stateSearchInput.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const filteredCountries = country
    .filter((c) =>
      c.name.toLowerCase().includes(countrySearchInput.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  if (loading && !formData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 text-sm">
          Loading admission details...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">
          Failed to load data, Try Again
        </p>
      </div>
    );
  }

  return (
    <div className="mb-24 md:mb-10">
      <style>{constants.hideEdgeRevealStyle}</style>
      <form
        className="w-full max-w-7xl mx-auto p-6 bg-base-100 rounded-box my-5 shadow-sm focus:outline-none mb-10"
        onSubmit={handleSubmit(onSubmit)}
      >
        <h1 className="text-3xl font-bold text-center mb-8">
          Edit Student Details{" "}
          <i className="fa-solid fa-pen-to-square ml-2"></i>
        </h1>

        {/* Student Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 mb-3">
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-child-reaching text-sm"></i>
                  Is RTE Student?
                </span>
                <input
                  type="checkbox"
                  {...register("is_rte")}
                  onChange={handleRTECheckboxChange}
                  checked={isRTE}
                  className="checkbox checkbox-primary"
                />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  First Name <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="text"
                {...register("student.first_name", {
                  required: "First name is required",
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                })}
                placeholder="First Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.first_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.first_name && (
                <span className="text-error text-sm">
                  {errors.student.first_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-pen text-sm"></i>
                  Middle Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.middle_name && (
                <span className="text-error text-sm">
                  {errors.student.middle_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Last Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.last_name", {
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.last_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.last_name && (
                <span className="text-error text-sm">
                  {errors.student.last_name.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  Email <span className="text-error">*</span>
                </span>
              </label>
              <input
                type="email"
                {...register("student.email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="student@example.com"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.email ? "input-error" : ""
                  }`}
              />
              {errors.student?.email && (
                <span className="text-error text-sm">
                  {errors.student.email.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  Status <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("student.is_active", {
                  required: "Status is required",
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.student?.is_active ? "select-error" : ""
                  }`}
                disabled={true}
              >
                <option value="">Select Status</option>
                <option value="true">Active</option>
                <option value="false">InActive</option>
              </select>
              {errors.student?.is_active && (
                <span className="text-error text-sm">
                  {errors.student.is_active.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar-days text-sm"></i>
                  Date of Birth
                </span>
              </label>
              <input
                type="date"
                {...register("student.date_of_birth", {
                  validate: {
                    notFuture: (value) => {
                      if (!value) return true;
                      const selectedDate = new Date(value);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      if (isNaN(selectedDate.getTime())) {
                        return "Invalid date format";
                      }
                      return (
                        selectedDate <= today ||
                        "Date of birth cannot be in the future"
                      );
                    },
                  },
                })}
                max={new Date().toISOString().split("T")[0]}
                className={`input input-bordered w-full focus:outline-none ${errors.student?.date_of_birth ? "input-error" : ""
                  }`}
              />
              {errors.student?.date_of_birth && (
                <span className="text-error text-sm">
                  {errors.student.date_of_birth.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-venus-mars text-sm"></i>
                  Gender
                </span>
              </label>
              <select
                {...register("student.gender", {})}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.student?.gender ? "select-error" : ""
                  }`}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.student?.gender && (
                <span className="text-error text-sm">
                  {errors.student.gender.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Father's Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.father_name", {
                  maxLength: {
                    value: 100,
                    message: "Father's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Father's Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.father_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.father_name && (
                <span className="text-error text-sm">
                  {errors.student.father_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Mother's Name
                </span>
              </label>
              <input
                type="text"
                {...register("student.mother_name", {
                  maxLength: {
                    value: 100,
                    message: "Mother's name cannot exceed 100 characters",
                  },
                })}
                placeholder="Mother's Name"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.mother_name ? "input-error" : ""
                  }`}
              />
              {errors.student?.mother_name && (
                <span className="text-error text-sm">
                  {errors.student.mother_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-hands-praying text-sm"></i>
                  Religion
                </span>
              </label>
              <input
                type="text"
                {...register("student.religion", {
                  maxLength: {
                    value: 100,
                    message: "Religion cannot exceed 100 characters",
                  },
                })}
                placeholder="Religion"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.religion ? "input-error" : ""
                  }`}
              />
              {errors.student?.religion && (
                <span className="text-error text-sm">
                  {errors.student.religion.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-tag text-sm"></i>
                  Category
                </span>
              </label>
              <select
                {...register("student.category", {})}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.student?.category ? "select-error" : ""
                  }`}
              >
                <option value="">Select Category</option>
                <option value="GEN">General</option>
                <option value="OBC">Other Backward Class</option>
                <option value="SC">Scheduled Caste</option>
                <option value="ST">Scheduled Tribe</option>
              </select>
              {errors.student?.category && (
                <span className="text-error text-sm">
                  {errors.student.category.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-ruler-vertical text-sm"></i>
                  Height (cm)
                </span>
              </label>
              <input
                type="number"
                {...register("student.height", {
                  min: { value: 0, message: "Height must be positive" },
                })}
                placeholder="Height"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.height ? "input-error" : ""
                  }`}
              />
              {errors.student?.height && (
                <span className="text-error text-sm">
                  {errors.student.height.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-weight-scale text-sm"></i>
                  Weight (kg)
                </span>
              </label>
              <input
                type="number"
                {...register("student.weight", {
                  min: { value: 0, message: "Weight must be positive" },
                })}
                placeholder="Weight"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.weight ? "input-error" : ""
                  }`}
              />
              {errors.student?.weight && (
                <span className="text-error text-sm">
                  {errors.student.weight.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-heart-pulse text-sm"></i>
                  Blood Group
                </span>
              </label>
              <select
                {...register("student.blood_group")}
                className="select select-bordered w-full focus:outline-none cursor-pointer"
              >
                <option value="">Select Blood Group</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          {/* New Fields Section - Additional Student Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-sm"></i>
                  Scholar No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.scholar_number", {
                  maxLength: {
                    value: 50,
                    message: "Scholar number cannot exceed 50 characters",
                  },
                })}
                placeholder="Scholar Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.scholar_number && (
                <span className="text-error text-sm">
                  {errors.student.scholar_number.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-address-card text-sm"></i>
                  Aadhaar No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.aadhaar_number", {
                  pattern: {
                    value: /^\d{12}$/,
                    message: "Aadhaar number must be 12 digits",
                  },
                  maxLength: {
                    value: 12,
                    message: "Aadhaar number cannot exceed 12 digits",
                  },
                })}
                placeholder="Aadhaar Number"
                className="input input-bordered w-full focus:outline-none"
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                }}
              />
              {errors.student?.aadhaar_number && (
                <span className="text-error text-sm">
                  {errors.student.aadhaar_number.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-file-invoice text-sm"></i>
                  FMID No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.FMID_number", {
                  maxLength: {
                    value: 50,
                    message: "FMID number cannot exceed 50 characters",
                  },
                })}
                placeholder="FMID Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.FMID_number && (
                <span className="text-error text-sm">
                  {errors.student.FMID_number.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-badge text-sm"></i>
                  Apaar ID No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.apaar_number", {
                  maxLength: {
                    value: 50,
                    message: "Apaar ID cannot exceed 50 characters",
                  },
                })}
                placeholder="Apaar ID Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.apaar_number && (
                <span className="text-error text-sm">
                  {errors.student.apaar_number.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-hashtag text-sm"></i>
                  PEN No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.PEN_number", {
                  maxLength: {
                    value: 50,
                    message: "PEN number cannot exceed 50 characters",
                  },
                })}
                placeholder="PEN Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.PEN_number && (
                <span className="text-error text-sm">
                  {errors.student.PEN_number.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card-alt text-sm"></i>
                  BPL No.
                </span>
              </label>
              <input
                type="text"
                {...register("student.BPL_number", {
                  maxLength: {
                    value: 50,
                    message: "BPL number cannot exceed 50 characters",
                  },
                })}
                placeholder="BPL Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.BPL_number && (
                <span className="text-error text-sm">
                  {errors.student.BPL_number.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Enrollment No.
                </span>
              </label>
              <input
                type="text"
                {...register("enrollment_no", {
                  maxLength: {
                    value: 50,
                    message: "Enrollment number cannot exceed 50 characters",
                  },
                })}
                placeholder="Enrollment Number"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.enrollment_no && (
                <span className="text-error text-sm">
                  {errors.enrollment_no.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-chalkboard-user text-sm"></i>
                  Class Section
                </span>
              </label>
              <select
                {...register("class_section")}
                className="select select-bordered w-full focus:outline-none cursor-pointer"
              >
                <option value="">Select Section</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-server text-sm"></i>
                  SSSMID
                </span>
              </label>
              <input
                type="text"
                {...register("student.SSSMID", {
                  maxLength: {
                    value: 50,
                    message: "SSSMID cannot exceed 50 characters",
                  },
                })}
                placeholder="SSSMID"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.student?.SSSMID && (
                <span className="text-error text-sm">
                  {errors.student.SSSMID.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-people-group text-sm"></i>
                  Number of Siblings
                </span>
              </label>
              <input
                type="number"
                {...register("student.number_of_siblings", {
                  min: {
                    value: 0,
                    message: "Number of siblings cannot be negative",
                  },
                  max: {
                    value: 15,
                    message: "Sibling cannot exceed more than 15",
                  },
                })}
                placeholder="Number of Siblings"
                className={`input input-bordered w-full focus:outline-none ${errors.student?.number_of_siblings ? "input-error" : ""
                  }`}
              />
              {errors.student?.number_of_siblings && (
                <span className="text-error text-sm">
                  {errors.student.number_of_siblings.message}
                </span>
              )}
            </div>

            {isRTE && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text flex items-center gap-2">
                    <i className="fa-solid fa-id-card text-sm"></i>
                    RTE Number <span className="text-error">*</span>
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={50}
                  {...register("rte_number", {
                    required: "RTE number is required for RTE students",
                    maxLength: {
                      value: 50,
                      message: "RTE number cannot exceed 50 characters",
                    },
                  })}
                  placeholder="RTE Number"
                  className={`input input-bordered w-full focus:outline-none ${errors.rte_number ? "input-error" : ""
                    }`}
                />
                {errors.rte_number && (
                  <span className="text-error text-sm">
                    {errors.rte_number.message}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Guardian Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold whitespace-nowrap">
              Guardian Information
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  First Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.first_name", {
                  maxLength: {
                    value: 100,
                    message: "First name cannot exceed 100 characters",
                  },
                })}
                placeholder="First Name"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.first_name ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.first_name && (
                <span className="text-error text-sm">
                  {errors.guardian.first_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-pen text-sm"></i>
                  Middle Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.middle_name", {
                  maxLength: {
                    value: 100,
                    message: "Middle name cannot exceed 100 characters",
                  },
                })}
                placeholder="Middle Name"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.guardian?.middle_name && (
                <span className="text-error text-sm">
                  {errors.guardian.middle_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-tag text-sm"></i>
                  Last Name
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.last_name", {
                  maxLength: {
                    value: 100,
                    message: "Last name cannot exceed 100 characters",
                  },
                })}
                placeholder="Last Name"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.last_name ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.last_name && (
                <span className="text-error text-sm">
                  {errors.guardian.last_name.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-sm"></i>
                  Email
                </span>
              </label>
              <input
                type="email"
                {...register("guardian.email", {
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Invalid email format",
                  },
                })}
                placeholder="guardian@example.com"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.email ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.email && (
                <span className="text-error text-sm">
                  {errors.guardian.email.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user-shield text-sm"></i>
                  Guardian Type
                </span>
              </label>
              <select
                {...register("guardian_type_input")}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.guardian_type_input ? "select-error" : ""
                  }`}
                value={selectedGuardianType}
                onChange={handleGuardianTypeChange}
              >
                <option value="">Select Guardian Type</option>
                {guardianTypes.map((guardianTy) => (
                  <option value={guardianTy.name} key={guardianTy.id}>
                    {guardianTy.name}
                  </option>
                ))}
              </select>
              {errors.guardian_type_input && (
                <span className="text-error text-sm">
                  {errors.guardian_type_input.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-phone text-sm"></i>
                  Phone Number
                </span>
              </label>
              <input
                type="tel"
                {...register("guardian.phone_no", {
                  pattern: {
                    value: /^[6789]\d{9}$/,
                    message:
                      "Phone number must start with 6, 7, 8, or 9 and be exactly 10 digits",
                  },
                  minLength: {
                    value: 10,
                    message: "Phone number must be exactly 10 digits",
                  },
                  maxLength: {
                    value: 10,
                    message: "Phone number must be exactly 10 digits",
                  },
                })}
                placeholder="Phone Number"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.phone_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
              />
              {errors.guardian?.phone_no && (
                <span className="text-error text-sm">
                  {errors.guardian.phone_no.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-money-bill-wave text-sm"></i>
                  Annual Income
                </span>
              </label>
              <input
                type="number"
                {...register("guardian.annual_income", {
                  min: {
                    message: "Annual income cannot be negative",
                  },
                })}
                placeholder="Annual Income"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.annual_income ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.annual_income && (
                <span className="text-error text-sm">
                  {errors.guardian.annual_income.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-sm"></i>
                  Means of Livelihood
                </span>
              </label>
              <select
                {...register("guardian.means_of_livelihood")}
                className="select select-bordered w-full focus:outline-none cursor-pointer"
              >
                <option value="">Select</option>
                <option value="Govt">Government</option>
                <option value="Non-Govt">Non-Government</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Qualification
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.qualification", {
                  maxLength: {
                    value: 300,
                    message: "Qualification cannot exceed 300 characters",
                  },
                })}
                placeholder="Qualification"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.qualification ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.qualification && (
                <span className="text-error text-sm">
                  {errors.guardian.qualification.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-briefcase text-sm"></i>
                  Occupation
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.occupation", {
                  maxLength: {
                    value: 300,
                    message: "Occupation cannot exceed 300 characters",
                  },
                })}
                placeholder="Occupation"
                className={`input input-bordered w-full focus:outline-none ${errors.guardian?.occupation ? "input-error" : ""
                  }`}
              />
              {errors.guardian?.occupation && (
                <span className="text-error text-sm">
                  {errors.guardian.occupation.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-id-card text-sm"></i>
                  Designation
                </span>
              </label>
              <input
                type="text"
                {...register("guardian.designation", {
                  maxLength: {
                    value: 300,
                    message: "Designation cannot exceed 300 characters",
                  },
                })}
                placeholder="Designation"
                className="input input-bordered w-full focus:outline-none"
              />
              {errors.guardian?.designation && (
                <span className="text-error text-sm">
                  {errors.guardian.designation.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Academic Information Section */}
        {/* Academic Information Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Academic Information</h2>

          {/* Row 1: Year Level & School Year */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-graduation-cap text-sm"></i>
                  Year Level <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("year_level", {
                  required: "Year level is required",
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.year_level ? "select-error" : ""
                  }`}
              >
                <option value="">Select Year Level</option>
                {yearLevel.map((yearlev) => (
                  <option value={yearlev.level_name} key={yearlev.id}>
                    {yearlev.level_name}
                  </option>
                ))}
              </select>
              {errors.year_level && (
                <span className="text-error text-sm">
                  {errors.year_level.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar text-sm"></i>
                  School Year <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("school_year", {
                  required: "School year is required",
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.school_year ? "select-error" : ""
                  }`}
              >
                <option value="">Select School Year</option>
                {schoolYears.map((schoolYear) => (
                  <option value={schoolYear.year_name} key={schoolYear.id}>
                    {schoolYear.year_name}
                  </option>
                ))}
              </select>
              {errors.school_year && (
                <span className="text-error text-sm">
                  {errors.school_year.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Class Section & Stream - NEW with required validation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-chalkboard-user text-sm"></i>
                  Class Section & Stream <span className="text-error">*</span>
                </span>
              </label>
              <select
                {...register("class_section", {
                  required: "Class section is required"
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.class_section ? "select-error" : ""
                  }`}
              >
                <option value="">Select Section or Stream</option>
                {/* Sections */}
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
                {/* Streams */}
                <option value="PCM">PCM (Physics, Chemistry, Mathematics)</option>
                <option value="PCB">PCB (Physics, Chemistry, Biology)</option>
                <option value="COMM">COMM (Commerce)</option>
                <option value="ARTS">ARTS (Arts)</option>
              </select>
              {errors.class_section && (
                <span className="text-error text-sm">
                  {errors.class_section.message}
                </span>
              )}
            </div>

            {/* Optional: Extra field if needed */}
            <div className="form-control">
              {/* You can add another field here if needed */}
            </div>
          </div>

          {/* Row 3: Previous School & Previous Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-school text-sm"></i>
                  Previous School Name
                </span>
              </label>
              <input
                type="text"
                {...register("previous_school_name", {
                  maxLength: {
                    value: 200,
                    message: "School name cannot exceed 200 characters",
                  },
                })}
                placeholder="Previous School Name"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_school_name ? "input-error" : ""
                  }`}
              />
              {errors.previous_school_name && (
                <span className="text-error text-sm">
                  {errors.previous_school_name.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-book text-sm"></i>
                  Previous Class/Grade
                </span>
              </label>
              <input
                type="text"
                {...register("previous_standard_studied", {
                  maxLength: {
                    value: 200,
                    message: "Class/grade cannot exceed 200 characters",
                  },
                })}
                placeholder="Previous Class/Grade"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_standard_studied ? "input-error" : ""
                  }`}
              />
              {errors.previous_standard_studied && (
                <span className="text-error text-sm">
                  {errors.previous_standard_studied.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 4: Admission Date & TC Letter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-calendar-check text-sm"></i>
                  Admission Date
                </span>
              </label>
              <input
                type="date"
                max={new Date().toISOString().split("T")[0]}
                {...register("admission_date", {
                  validate: (value) => {
                    if (!value) return true;
                    const selectedDate = new Date(value);
                    const today = new Date();
                    if (selectedDate > today) {
                      return "Future dates are not allowed";
                    }
                    return true;
                  },
                })}
                className={`input input-bordered w-full focus:outline-none ${errors.admission_date ? "input-error" : ""
                  }`}
              />
              {errors.admission_date && (
                <span className="text-error text-sm">
                  {errors.admission_date.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-file text-sm"></i>
                  TC Letter
                </span>
              </label>
              <select
                {...register("tc_letter", {
                })}
                className={`select select-bordered w-full focus:outline-none cursor-pointer ${errors.tc_letter ? "select-error" : ""
                  }`}
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="not_applicable">Not Applicable</option>
                <option value="yes">Yes</option>
              </select>
              {errors.tc_letter && (
                <span className="text-error text-sm">
                  {errors.tc_letter.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 5: Emergency Contact & Distance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-phone text-sm"></i>
                  Emergency Contact
                </span>
              </label>
              <input
                type="tel"
                {...register("emergency_contact_no", {
                  pattern: {
                    value: /^[6789]\d{9}$/,
                    message: "Emergency contact must start with 6, 7, 8, or 9 and be exactly 10 digits",
                  },
                  minLength: {
                    value: 10,
                    message: "Emergency contact must be exactly 10 digits",
                  },
                  maxLength: {
                    value: 10,
                    message: "Emergency contact must be exactly 10 digits",
                  },
                })}
                placeholder="Emergency Contact"
                className={`input input-bordered w-full focus:outline-none ${errors.emergency_contact_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/\D/g, "");
                  if (e.target.value.length > 10) {
                    e.target.value = e.target.value.slice(0, 10);
                  }
                }}
              />
              {errors.emergency_contact_no && (
                <span className="text-error text-sm">
                  {errors.emergency_contact_no.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-road text-sm"></i>
                  Distance to School (km)
                </span>
              </label>
              <input
                type="number"
                {...register("entire_road_distance_from_home_to_school", {
                  min: { value: 0, message: "Distance cannot be negative" },
                  maxLength: {
                    value: 100,
                    message: "Distance cannot exceed 100 characters",
                  },
                })}
                placeholder="Distance in km"
                className={`input input-bordered w-full focus:outline-none ${errors.entire_road_distance_from_home_to_school
                  ? "input-error"
                  : ""
                  }`}
              />
              {errors.entire_road_distance_from_home_to_school && (
                <span className="text-error text-sm">
                  {errors.entire_road_distance_from_home_to_school.message}
                </span>
              )}
            </div>
          </div>

          {/* Row 6: Marks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-marker text-sm"></i>
                  Marks Obtained
                </span>
              </label>
              <input
                type="number"
                {...register("obtain_marks", {
                  min: { value: 0, message: "Marks cannot be negative" },
                })}
                placeholder="Marks Obtained"
                className={`input input-bordered w-full focus:outline-none ${errors.obtain_marks ? "input-error" : ""
                  }`}
              />
              {errors.obtain_marks && (
                <span className="text-error text-sm">
                  {errors.obtain_marks.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-chart-simple text-sm"></i>
                  Total Marks
                </span>
              </label>
              <input
                type="number"
                {...register("total_marks", {
                  min: { value: 0, message: "Total marks cannot be negative" },
                })}
                placeholder="Total Marks"
                className={`input input-bordered w-full focus:outline-none ${errors.total_marks ? "input-error" : ""
                  }`}
              />
              {errors.total_marks && (
                <span className="text-error text-sm">
                  {errors.total_marks.message}
                </span>
              )}
            </div>

            {/* Previous Percentage Field */}
            {/* <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-percent text-sm"></i>
                  Previous Percentage
                </span>
              </label>
              <input
                type="number"
                {...register("previous_percentage", {
                  min: { value: 0, message: "Percentage cannot be negative" },
                  max: { value: 100, message: "Percentage cannot exceed 100%" },
                  validate: (value) => {
                    if (value && (value < 0 || value > 100)) {
                      return "Percentage must be between 0 and 100";
                    }
                    return true;
                  },
                })}
                placeholder="Previous Percentage"
                step="0.01"
                className={`input input-bordered w-full focus:outline-none ${errors.previous_percentage ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > 100) e.target.value = 100;
                  if (value < 0) e.target.value = 0;
                }}
              />
              {errors.previous_percentage && (
                <span className="text-error text-sm">
                  {errors.previous_percentage.message}
                </span>
              )}
            </div> */}
            {/* Previous Percentage Field - Auto-calculated */}
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-percent text-sm"></i>
                  Previous Percentage
                </span>
              </label>
              <input
                type="number"
                {...register("previous_percentage", {
                  min: { value: 0, message: "Percentage cannot be negative" },
                  max: { value: 100, message: "Percentage cannot exceed 100%" },
                  validate: (value) => {
                    if (value && (value < 0 || value > 100)) {
                      return "Percentage must be between 0 and 100";
                    }
                    return true;
                  },
                })}
                placeholder="Auto-calculated"
                step="0.01"
                readOnly
                className={`input input-bordered w-full focus:outline-none bg-gray-100 dark:bg-gray-700 cursor-not-allowed ${errors.previous_percentage ? "input-error" : ""
                  }`}
              />
              {errors.previous_percentage && (
                <span className="text-error text-sm">
                  {errors.previous_percentage.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Address Information Section - OPTIONAL FIELDS */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Residential Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-home text-sm"></i>
                  House Number
                </span>
              </label>
              <input
                type="number"
                {...register("address_input.house_no", {
                  min: { value: -2147483648, message: "Invalid house number" },
                  max: { value: 2147483647, message: "Invalid house number" },
                })}
                placeholder="House Number"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.house_no ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.house_no && (
                <span className="text-error text-sm">
                  {errors.address_input.house_no.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-location text-sm"></i>
                  Habitation
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.habitation", {
                  maxLength: {
                    value: 100,
                    message: "Habitation cannot exceed 100 characters",
                  },
                })}
                placeholder="Habitation"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.habitation ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.habitation && (
                <span className="text-error text-sm">
                  {errors.address_input.habitation.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map text-sm"></i>
                  Ward Number
                </span>
              </label>
              <input
                type="number"
                {...register("address_input.ward_no", {
                  min: { value: -2147483648, message: "Invalid ward number" },
                  max: { value: 2147483647, message: "Invalid ward number" },
                })}
                placeholder="Ward Number"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.ward_no ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.ward_no && (
                <span className="text-error text-sm">
                  {errors.address_input.ward_no.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-pin text-sm"></i>
                  Zone
                </span>
              </label>
              <input
                type="number"
                {...register("address_input.zone_no", {
                  min: { value: -2147483648, message: "Invalid zone number" },
                  max: { value: 2147483647, message: "Invalid zone number" },
                })}
                placeholder="Zone"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.zone_no ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.zone_no && (
                <span className="text-error text-sm">
                  {errors.address_input.zone_no.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-building text-sm"></i>
                  Block
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.block", {
                  maxLength: {
                    value: 100,
                    message: "Block cannot exceed 100 characters",
                  },
                })}
                placeholder="Block"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.block ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.block && (
                <span className="text-error text-sm">
                  {errors.address_input.block.message}
                </span>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map text-sm"></i>
                  District
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.district", {
                  maxLength: {
                    value: 100,
                    message: "District cannot exceed 100 characters",
                  },
                })}
                placeholder="District"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.district ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.district && (
                <span className="text-error text-sm">
                  {errors.address_input.district.message}
                </span>
              )}
            </div>
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-city text-sm"></i>
                  City
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer"
                onClick={() => setShowCityDropdown(!showCityDropdown)}
              >
                {selectedCityName || "Select City"}
                <i
                  className={`fa-solid fa-chevron-${showCityDropdown ? "up" : "down"
                    } ml-2`}
                ></i>
              </div>

              {showCityDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
                    <input
                      type="text"
                      placeholder="Search City..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={citySearchInput}
                      onChange={(e) => setCitySearchInput(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredCities.length > 0 ? (
                      filteredCities.map(
                        (city) =>
                          city && (
                            <p
                              key={city.id}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                              onClick={() => {
                                setValue(
                                  "address_input.city",
                                  city.id.toString(),
                                  {
                                    shouldValidate: true,
                                  }
                                );
                                trigger("address_input.city");
                                setSelectedCityName(city.name);
                                setCitySearchInput("");
                                setShowCityDropdown(false);
                              }}
                            >
                              {city.name}
                            </p>
                          )
                      )
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No cities found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errors.address_input?.city && (
                <span className="text-error text-sm">
                  {errors.address_input.city.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-map-signs text-sm"></i>
                  Division
                </span>
              </label>
              <input
                type="text"
                {...register("address_input.division", {
                  maxLength: {
                    value: 100,
                    message: "Division cannot exceed 100 characters",
                  },
                })}
                placeholder="Division"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.division ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.division && (
                <span className="text-error text-sm">
                  {errors.address_input.division.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-flag text-sm"></i>
                  State
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer"
                onClick={() => setShowStateDropdown(!showStateDropdown)}
              >
                {selectedStateName || "Select State"}
                <i
                  className={`fa-solid fa-chevron-${showStateDropdown ? "up" : "down"
                    } ml-2`}
                ></i>
              </div>

              {showStateDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm bg-white dark:bg-[#242627]">
                    <input
                      type="text"
                      placeholder="Search State..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={stateSearchInput}
                      onChange={(e) => setStateSearchInput(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredStates.length > 0 ? (
                      filteredStates.map((state) => (
                        <p
                          key={state.id}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize"
                          onClick={() => {
                            setValue(
                              "address_input.state",
                              state.id.toString(),
                              {
                                shouldValidate: true,
                              }
                            );
                            trigger("address_input.state");
                            setSelectedStateName(state.name);
                            setStateSearchInput("");
                            setShowStateDropdown(false);
                          }}
                        >
                          {state.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No states found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errors.address_input?.state && (
                <span className="text-error text-sm">
                  {errors.address_input.state.message}
                </span>
              )}
            </div>

            <div className="form-control relative">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-globe text-sm"></i>
                  Country
                </span>
              </label>

              <div
                className="input input-bordered w-full flex items-center justify-between cursor-pointer "
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              >
                {selectedCountryName || "Select Country"}
                <i
                  className={`fa-solid fa-chevron-${showCountryDropdown ? "up" : "down"
                    } ml-2`}
                ></i>
              </div>

              {showCountryDropdown && (
                <div className="absolute z-10 bg-white dark:bg-[#242627] rounded w-full mt-1 shadow-lg border border-gray-300 dark:border-gray-600">
                  <div className="p-2 sticky top-0 shadow-sm">
                    <input
                      type="text"
                      placeholder="Search Country..."
                      className="input input-bordered w-full focus:outline-none bg-white dark:bg-[#242627] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-500"
                      value={countrySearchInput}
                      onChange={(e) => setCountrySearchInput(e.target.value)}
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto">
                    {filteredCountries.length > 0 ? (
                      filteredCountries.map((country) => (
                        <p
                          key={country.id}
                          className="p-2 cursor-pointer capitalize"
                          onClick={() => {
                            setValue(
                              "address_input.country",
                              country.id.toString(),
                              {
                                shouldValidate: true,
                              }
                            );
                            trigger("address_input.state");
                            setSelectedCountryName(country.name);
                            setCountrySearchInput("");
                            setShowCountryDropdown(false);
                          }}
                        >
                          {country.name}
                        </p>
                      ))
                    ) : (
                      <p className="p-2 text-gray-500 dark:text-gray-400">
                        No countries found
                      </p>
                    )}
                  </div>
                </div>
              )}

              {errors.address_input?.country && (
                <span className="text-error text-sm">
                  {errors.address_input.country.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-mailbox text-sm"></i>
                  Pin Code
                </span>
              </label>
              <input
                type="number"
                {...register("address_input.area_code", {
                  min: { value: -2147483648, message: "Invalid pin code" },
                  max: { value: 2147483647, message: "Invalid pin code" },
                })}
                placeholder="Pin Code"
                className={`input input-bordered w-full focus:outline-none ${errors.address_input?.area_code ? "input-error" : ""
                  }`}
              />
              {errors.address_input?.area_code && (
                <span className="text-error text-sm">
                  {errors.address_input.area_code.message}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-location-dot text-sm"></i>
                  Full Address Line
                </span>
              </label>
              <textarea
                {...register("address_input.address_line", {
                  maxLength: {
                    value: 250,
                    message: "Address line cannot exceed 250 characters",
                  },
                })}
                placeholder="Full Address"
                className="textarea textarea-bordered w-full focus:outline-none"
              ></textarea>
              {errors.address_input?.address_line && (
                <span className="text-error text-sm">
                  {errors.address_input.address_line.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details Section */}
        <div className="bg-base-200 p-6 rounded-box mb-6">
          <h2 className="text-2xl font-bold mb-4">Bank Account Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-user text-sm"></i>
                  Account Holder Name
                  {checkIfAnyBankFieldFilled() && (
                    <span className="text-error">*</span>
                  )}
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.holder_name", {
                  maxLength: {
                    value: 50,
                    message: "Holder name cannot exceed 50 characters",
                  },
                  validate: {
                    requiredIfAnyBankField: (value) => {
                      if (checkIfAnyBankFieldFilled()) {
                        return value?.trim()
                          ? true
                          : "Account holder name is required";
                      }
                      return true;
                    },
                  },
                })}
                placeholder="Full Name as in Bank"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.holder_name ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .replace(/[^A-Za-z\s]/g, "")
                    .replace(/\s+/g, " ")
                    .replace(/^\s+/g, "");
                }}
              />
              {errors.banking_detail_input?.holder_name && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.holder_name.message}
                </span>
              )}
            </div>

            <div className="form-control relative" ref={bankInputRef}>
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-university text-sm"></i>
                  Bank Name
                  {checkIfAnyBankFieldFilled() && (
                    <span className="text-error">*</span>
                  )}
                </span>
              </label>

              <input
                type="hidden"
                {...register("banking_detail_input.bank_name", {
                  validate: {
                    requiredIfAnyBankField: (value) => {
                      if (checkIfAnyBankFieldFilled()) {
                        return value
                          ? true
                          : "Bank name is required";
                      }
                      return true;
                    },
                  },
                })}
              />

              <input
                type="text"
                value={bankQuery}
                placeholder="Search or Add Bank Name"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.bank_name ? "input-error" : ""
                  }`}
                onChange={handleBankInputChange}
                onFocus={() => {
                  setFilteredBanks(bankNames);
                  setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateBank();
                  }
                  if (e.key === "Escape") setShowDropdown(false);
                }}
                autoComplete="off"
              />

              {errors.banking_detail_input?.bank_name && (
                <span className="text-error text-sm mt-1">
                  {errors.banking_detail_input.bank_name.message}
                </span>
              )}

              {showDropdown && (
                <ul className="absolute z-20 w-full bg-white border border-gray-300 rounded mt-1 max-h-60 overflow-y-auto dark:bg-[#242627] dark:border-gray-600">
                  {filteredBanks.map((b) => (
                    <li
                      key={b.id}
                      className="px-3 py-2 hover:bg-gray-200 cursor-pointer dark:hover:bg-gray-600 dark:text-gray-100"
                      onClick={() => handleSelectBank(b)}
                    >
                      {b.name}
                    </li>
                  ))}
                  {bankQuery?.trim() &&
                    !bankNames.some(
                      (b) =>
                        b.name.toLowerCase() === bankQuery.trim().toLowerCase()
                    ) && (
                      <li
                        className="px-3 py-2 bg-green-50 hover:bg-green-100 cursor-pointer flex items-center gap-2 border-t dark:bg-green-900 dark:hover:bg-green-800 dark:text-gray-100"
                        onClick={handleCreateBank}
                      >
                        {creatingBank ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-plus"></i>
                        )}
                        Add "{bankQuery.trim()}" as new bank
                      </li>
                    )}
                </ul>
              )}

              {!!createBankError && (
                <span className="text-error text-sm mt-1">
                  {createBankError}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-credit-card text-sm"></i>
                  Account Number
                  {checkIfAnyBankFieldFilled() && (
                    <span className="text-error">*</span>
                  )}
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.account_no", {
                  minLength: {
                    value: 9,
                    message: "Account number must be at least 9 digits",
                  },
                  maxLength: {
                    value: 18,
                    message: "Account number cannot exceed 18 digits",
                  },
                  validate: {
                    requiredIfAnyBankField: (value) => {
                      if (checkIfAnyBankFieldFilled()) {
                        return value?.toString().trim()
                          ? true
                          : "Account number is required";
                      }
                      return true;
                    },
                    validNumber: (value) => {
                      if (value && !/^[0-9]+$/.test(value)) {
                        return "Account number must contain digits only";
                      }
                      if (value && /^0+$/.test(value)) {
                        return "Account number cannot be all zeros";
                      }
                      return true;
                    },
                  },
                })}
                placeholder="Account Number"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.account_no ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "");
                }}
              />
              {errors.banking_detail_input?.account_no && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.account_no.message}
                </span>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text flex items-center gap-2">
                  <i className="fa-solid fa-code text-sm"></i>
                  IFSC Code
                  {checkIfAnyBankFieldFilled() && (
                    <span className="text-error">*</span>
                  )}
                </span>
              </label>
              <input
                type="text"
                {...register("banking_detail_input.ifsc_code", {
                  validate: {
                    requiredIfAnyBankField: (value) => {
                      if (checkIfAnyBankFieldFilled()) {
                        return value?.trim()
                          ? true
                          : "IFSC code is required";
                      }
                      return true;
                    },
                    validFormat: (value) => {
                      if (!value) return true;
                      const trimmed = value.trim().toUpperCase();
                      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed)) {
                        return "Invalid IFSC format. Must be like SBIN0001234";
                      }
                      return true;
                    },
                  },
                })}
                placeholder="eg: SBIN0001234"
                className={`input input-bordered w-full focus:outline-none ${errors.banking_detail_input?.ifsc_code ? "input-error" : ""
                  }`}
                onInput={(e) => {
                  e.target.value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "");
                }}
              />
              {errors.banking_detail_input?.ifsc_code && (
                <span className="text-error text-sm">
                  {errors.banking_detail_input.ifsc_code.message}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-10">
          <button
            type="submit"
            className="btn bgTheme text-white w-40"
            disabled={loading}
          >
            {loading ? (
              <i className="fa-solid fa-spinner fa-spin mr-2"></i>
            ) : (
              <i className="fa-solid fa-floppy-disk mr-2"></i>
            )}
            {loading ? "" : "Update"}
          </button>
        </div>
      </form>

      {showEditSuccessModal && (
        <AdmissionEditedSuccessfully
          handleCloseOnly={handleCloseOnly}
          handleCloseAndNavigate={handleCloseAndNavigate}
        />
      )}

      {showAlert && (
        <dialog open className="modal modal-open">
          <div className="modal-box dark:bg-gray-800 dark:text-gray-100">
            <h3 className="font-bold text-lg">Edit Student Details</h3>
            {/* <p className="py-4">{alertMessage}</p> */}
            <p className="py-4 whitespace-pre-line">{alertMessage}</p>
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