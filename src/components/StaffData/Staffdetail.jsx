import React, { useContext, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchOfficeStaff, fetchTeachers } from "../../services/api/Api";
import { constants } from "../../global/constants";
// import { AuthContext } from "../../context/AuthContext";


const BASE_URL = constants.baseUrl;

const Staffdetail = () => {
  const { id, type } = useParams();
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  // const {axiosInstance} = useContext(AuthContext)

  const getStaff = async () => {
    try {
      if (type === "teacher") {
        const teacher = await fetchTeachers(id);
        setStaffData(teacher);
      } else if (type === "office") {
        const office = await fetchOfficeStaff(id);
        setStaffData(office);
      } else {
        setError("Invalid staff type.");
      }
    } catch (error) {
      console.error("Error loading staff data", error);
      setError("Failed to load staff data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStaff();
  }, [id, type]);

  // const handleTermination = async ()=>{
  //   const payload = {
  //     user_id:id
  //   }
  //   try {
  //      const response = await axiosInstance.post(
  //         `${BASE_URL}d/deactivate-user/`,
  //         payload,
  //         {
  //           headers: {
  //             "Content-Type": "application/json",
  //           },
  //         }
  //       );
  //       console.log(response);

  //   } catch (error) {
  //     console.log(error);

  //   }


  // }


  if (loading) {
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <i className="fa-solid fa-triangle-exclamation text-5xl text-red-400 mb-4"></i>
        <p className="text-lg text-red-400 font-medium">Failed to load data, Try Again</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-24 md:mb-10">
      <div className="p-6 bg-gray-100 dark:bg-gray-900 w-full min-h-screen">
        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg">
          <div className="bgTheme text-white px-4 py-2 rounded-t-md flex justify-between">
            <h2 className="text-3xl font-semibold capitalize">
              {type?.toLowerCase() === "teacher" ? "Teacher" : "Staff"} Profile - {staffData.first_name} {staffData.last_name}
            </h2>

            {/* <button
              type="button"
               onClick={() => {setShowAlert(true),handleTermination()}}
              className="inline-flex items-center px-3 py-1 shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 rounded-md"
            >
              Terminate
            </button> */}
          </div>

          <div className="p-6">
            <div className="mt-6">
              <div className="mt-2">
                {staffData.user_profile ? (
                  <img
                    src={`${BASE_URL}${staffData.user_profile.startsWith("/") ? "" : "/"}${staffData.user_profile}`}
                    alt="Profile"
                    className="w-24 h-24 object-cover border rounded-full dark:border-gray-600"
                  />
                ) : (
                  <span className="italic text-gray-400 dark:text-gray-400">No profile picture</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-dm text-gray-700 dark:text-gray-200 mt-6">
              <div className="capitalize">
                <strong>Full Name:</strong><br />
                {`${staffData.first_name} ${staffData.middle_name} ${staffData.last_name}`.replace(/\s+/g, " ").trim()}
              </div>
              <div><strong>Email:</strong><br />{staffData.email || "N/A"}</div>
              <div><strong>Phone:</strong><br />{staffData.phone_no || "N/A"}</div>
              <div className="capitalize"><strong>Gender:</strong><br />{staffData.gender || "N/A"}</div>
              <div><strong>Aadhar No:</strong><br />{staffData.adhaar_no || "N/A"}</div>
              <div><strong>PAN No:</strong><br />{staffData.pan_no || "N/A"}</div>
              <div><strong>Qualification:</strong><br />{staffData.qualification || "N/A"}</div>
              <div><strong>Date of joining:</strong><br />{staffData.joining_date || "N/A"}</div>
            </div>

            <h3 className="text-xl font-semibold mt-10 mb-4 text-gray-800 dark:text-gray-100">
              Banking Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-200">
              <div>
                <strong>Account Number:</strong><br />
                {staffData.banking_data?.account_no || "N/A"}
              </div>
              <div>
                <strong>IFSC Code:</strong><br />
                {staffData.banking_data?.ifsc_code || "N/A"}
              </div>
              <div className="md:col-span-2">
                <strong>Holder Name:</strong><br />
                {staffData.banking_data?.holder_name || "N/A"}
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-10 mb-4 text-gray-800 dark:text-gray-100">
              Address Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-gray-700 dark:text-gray-200">
              <div><strong>House No:</strong><br />{staffData.address_data?.house_no || "N/A"}</div>
              <div><strong>Habitation:</strong><br />{staffData.address_data?.habitation || "N/A"}</div>
              <div><strong>Ward No:</strong><br />{staffData.address_data?.ward_no || "N/A"}</div>
              <div><strong>Zone No:</strong><br />{staffData.address_data?.zone_no || "N/A"}</div>
              <div><strong>Block:</strong><br />{staffData.address_data?.block || "N/A"}</div>
              <div><strong>District:</strong><br />{staffData.address_data?.district || "N/A"}</div>
              <div><strong>Division:</strong><br />{staffData.address_data?.division || "N/A"}</div>
              <div><strong>Area Code:</strong><br />{staffData.address_data?.area_code || "N/A"}</div>
              <div className="md:col-span-2 lg:col-span-3">
                <strong>Address Line:</strong><br />{staffData.address_data?.address_line || "N/A"}
              </div>
              <div><strong>Country:</strong><br />{staffData.address_data?.country_name || "N/A"}</div>
              <div><strong>State:</strong><br />{staffData.address_data?.state_name || "N/A"}</div>
              <div><strong>City:</strong><br />{staffData.address_data?.city_name || "N/A"}</div>
            </div>

            <div className="flex justify-center p-8 gap-4">
              <Link to={`/staffdetail/update/${type}/${id}`}>
                <button type="button" className="btn bgTheme text-white">
                  <i className="fa-solid fa-pen-to-square"></i> Update Profile
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>


      {/* {showAlert && (
          <dialog className="modal modal-open">
            <div className="modal-box bg-white dark:bg-gray-800">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                Terminate User
              </h3>
              <p className="py-4 text-gray-700 dark:text-gray-200">
               are you sure you want to terminate {staffData.first_name} {staffData.last_name} ?
               
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
        )} */}
    </div>
  );
};

export default Staffdetail;
