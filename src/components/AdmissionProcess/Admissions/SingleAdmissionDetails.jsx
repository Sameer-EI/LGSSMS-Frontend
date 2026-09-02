import React, { useEffect, useState } from "react";
import {
  fetchAdmissionDetailsById,
  fetchBankNames,
} from "../../../services/api/Api";
import { useParams } from "react-router-dom";

export const SingleAdmissionDetails = () => {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bankList, setBankList] = useState([]);

  const getAdmissionDetailsById = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchAdmissionDetailsById(id);
      setDetails(data);
    } catch (err) {
      console.error("Failed to fetch admission details", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const getBankNames = async () => {
      try {
        const res = await fetchBankNames();
        setBankList(res);
      } catch (err) {
        console.error("Failed to fetch bank names", err);
      }
    };
    getBankNames();
  }, []);

  const getBankNameById = (id) => {
    const bank = bankList.find((b) => String(b.id) === String(id));
    return bank ? bank.name : id;
  };

  useEffect(() => {
    getAdmissionDetailsById();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium mb-4">
          Failed to load admission details.
        </p>
        <button
          onClick={getAdmissionDetailsById}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="p-4 text-center">No admission details available.</div>
    );
  }

  const getValue = (obj, key, fallback = "Not Provided") =>
    obj && obj[key] !== undefined && obj[key] !== null ? obj[key] : fallback;

  return (
    <div className="p-3 bg-gray-100 dark:bg-gray-900 min-h-screen text-gray-900 dark:text-gray-100 mb-24 md:mb-10">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        
        {/* Header */}
        <div className="bgTheme text-white px-6 py-4">
          <h1 className="text-2xl font-bold">
            {getValue(details.student_input, "first_name", "Unknown")}{" "}
            {getValue(details.student_input, "last_name", "")}'s Admission Details
          </h1>
        </div>

        <div className="p-6">
          
          {/* Student Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Student Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><p className="font-medium">Full Name:</p>
                <p>
                  {getValue(details.student_input, "first_name")}{" "}
                  {getValue(details.student_input, "middle_name")}{" "}
                  {getValue(details.student_input, "last_name")}
                </p>
              </div>

              <div><p className="font-medium">Father's Name:</p>
                <p>{getValue(details.student_input, "father_name")}</p>
              </div>

              <div><p className="font-medium">Mother's Name:</p>
                <p>{getValue(details.student_input, "mother_name")}</p>
              </div>

              <div><p className="font-medium">Roll No:</p>
                <p>{getValue(details.student_input, "roll_number", "Not Assigned")}</p>
              </div>

              <div><p className="font-medium">Date of Birth:</p>
                <p>{getValue(details.student_input, "date_of_birth")}</p>
              </div>

              <div><p className="font-medium">Gender:</p>
                <p>{getValue(details.student_input, "gender")}</p>
              </div>

              <div><p className="font-medium">Email:</p>
                <p>{getValue(details.student_input, "email")}</p>
              </div>

              <div><p className="font-medium">Blood Group:</p>
                <p>{getValue(details.student_input, "blood_group")}</p>
              </div>

              <div><p className="font-medium">Religion:</p>
                <p>{getValue(details.student_input, "religion")}</p>
              </div>

              <div><p className="font-medium">Category:</p>
                <p>{getValue(details.student_input, "category")}</p>
              </div>

              <div><p className="font-medium">Height / Weight:</p>
                <p>
                  {getValue(details.student_input, "height")} cm /
                  {getValue(details.student_input, "weight")} kg
                </p>
              </div>

              <div><p className="font-medium">Siblings:</p>
                <p>{details.student_input.number_of_siblings ?? "None"}</p>
              </div>

              <div><p className="font-medium">Contact Number:</p>
                <p>{getValue(details.student_input, "contact_number")}</p>
              </div>

              <div><p className="font-medium">Scholar Number:</p>
                <p>
                  {details.student_input.scholar_number &&
                  details.student_input.scholar_number !== "null"
                    ? details.student_input.scholar_number
                    : "N/A"}
                </p>
              </div>

              <div><p className="font-medium">Aadhaar Number:</p>
                <p>{getValue(details.student_input, "aadhaar_number")}</p>
              </div>

              <div><p className="font-medium">FMID Number:</p>
                <p>{getValue(details.student_input, "FMID_number")}</p>
              </div>

              <div><p className="font-medium">APAAR Number:</p>
                <p>{getValue(details.student_input, "apaar_number")}</p>
              </div>

              <div><p className="font-medium">PEN Number:</p>
                <p>{getValue(details.student_input, "PEN_number")}</p>
              </div>

              <div><p className="font-medium">BPL Number:</p>
                <p>{getValue(details.student_input, "BPL_number")}</p>
              </div>

              <div><p className="font-medium">SSSMID:</p>
                <p>{getValue(details.student_input, "SSSMID")}</p>
              </div>

              <div><p className="font-medium">Has RTE?</p>
                {details.is_rte ? <p>YES</p> : <p>NO</p>}
              </div>

              <div><p className="font-medium">RTE Number:</p>
                <p>{details.is_rte ? details.rte_number : "Not Applicable"}</p>
              </div>
            </div>
          </div>

          {/* Guardian Info */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Parent/Guardian Information</h2>

            {details.guardian_input ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div><p className="font-medium">Guardian Type:</p>
                  <p>{details.guardian_type || "Not Specified"}</p>
                </div>

                <div><p className="font-medium">Name:</p>
                  <p>
                    {getValue(details.guardian_input, "first_name")}{" "}
                    {getValue(details.guardian_input, "last_name")}
                  </p>
                </div>

                <div><p className="font-medium">Phone:</p>
                  <p>{getValue(details.guardian_input, "phone_no")}</p>
                </div>

                <div><p className="font-medium">Email:</p>
                  <p>{getValue(details.guardian_input, "email")}</p>
                </div>

                <div><p className="font-medium">Occupation:</p>
                  <p>{getValue(details.guardian_input, "occupation")}</p>
                </div>

                <div><p className="font-medium">Annual Income:</p>
                  <p>
                    {details.guardian_input?.annual_income
                      ? `₹${Number(details.guardian_input.annual_income).toLocaleString()}`
                      : "Not Provided"}
                  </p>
                </div>

                <div><p className="font-medium">Qualification:</p>
                  <p>{getValue(details.guardian_input, "qualification")}</p>
                </div>

                <div><p className="font-medium">Designation:</p>
                  <p>{getValue(details.guardian_input, "designation")}</p>
                </div>
              </div>
            ) : (
              <p>No guardian information provided.</p>
            )}
          </div>

          {/* Address */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Address Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div><p className="font-medium">Address:</p>
                <p>
                  {getValue(details.address, "house_no")},{" "}
                  {getValue(details.address, "address_line")}
                </p>
              </div>

              <div><p className="font-medium">Habitation:</p>
                <p>{getValue(details.address, "habitation")}</p>
              </div>

              <div><p className="font-medium">City/State:</p>
                <p>
                  {getValue(details.address, "city_name")},{" "}
                  {getValue(details.address, "state_name")}
                </p>
              </div>

              <div><p className="font-medium">Country:</p>
                <p>{getValue(details.address, "country_name")}</p>
              </div>

              <div><p className="font-medium">District:</p>
                <p>{getValue(details.address, "district")}</p>
              </div>

              <div><p className="font-medium">Division:</p>
                <p>{getValue(details.address, "division")}</p>
              </div>

              <div><p className="font-medium">Pin Code:</p>
                <p>{getValue(details.address, "area_code")}</p>
              </div>

              {/* ⭐ Newly Added */}
              <div>
                <p className="font-medium">Ward No:</p>
                <p>{getValue(details.address, "ward_no")}</p>
              </div>

              <div>
                <p className="font-medium">Zone No:</p>
                <p>{getValue(details.address, "zone_no")}</p>
              </div>

              <div>
                <p className="font-medium">Block:</p>
                <p>{getValue(details.address, "block")}</p>
              </div>

            </div>
          </div>

          {/* Admission Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Admission Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div><p className="font-medium">Year Level:</p>
                <p>{details.year_level || "Not Assigned"}</p>
              </div>

              <div><p className="font-medium">School Year:</p>
                <p>{details.school_year || "Not Specified"}</p>
              </div>

              <div><p className="font-medium">Admission Date:</p>
                <p>{details.admission_date || "Not Provided"}</p>
              </div>

              <div><p className="font-medium">Enrollment No:</p>
                <p>{details.enrollment_no || "Not Assigned"}</p>
              </div>

              <div><p className="font-medium">Distance to School:</p>
                <p>{details.entire_road_distance_from_home_to_school || "Not Provided"}</p>
              </div>

              <div><p className="font-medium">Previous School:</p>
                <p>{details.previous_school_name || "None"}</p>
              </div>

              <div><p className="font-medium">Class Section or Stream</p>
                <p>{details.class_section || "None"}</p>
              </div>

              <div><p className="font-medium">Previous Standard:</p>
                <p>{details.previous_standard_studied || "None"}</p>
              </div>

              <div><p className="font-medium">Previous Percentage:</p>
                <p>
                  {details.previous_percentage
                    ? `${Number(details.previous_percentage).toFixed(2)}%`
                    : "Not Available"}
                </p>
              </div>

              <div><p className="font-medium">TC Letter:</p>
                <p>{details.tc_letter || "Not Provided"}</p>
              </div>

              <div><p className="font-medium">Emergency Contact:</p>
                <p>{details.emergency_contact_no || "Not Provided"}</p>
              </div>

              {/* ⭐ Newly Added */}
              <div>
                <p className="font-medium">Obtained Marks:</p>
                <p>{getValue(details, "obtain_marks")}</p>
              </div>

              <div>
                <p className="font-medium">Total Marks:</p>
                <p>{getValue(details, "total_marks")}</p>
              </div>

            </div>
          </div>

          {/* Banking Details */}
          <div>
            <h2 className="text-xl font-semibold border-b pb-2 mb-4">Banking Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div><p className="font-medium">Account Holder:</p>
                <p>{getValue(details.banking_detail, "holder_name")}</p>
              </div>

              <div><p className="font-medium">Account Number:</p>
                <p>{getValue(details.banking_detail, "account_no")}</p>
              </div>

              <div><p className="font-medium">IFSC Code:</p>
                <p>{getValue(details.banking_detail, "ifsc_code")}</p>
              </div>

              <div><p className="font-medium">Bank Name:</p>
                <p>{getBankNameById(getValue(details.banking_detail, "bank_name"))}</p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
