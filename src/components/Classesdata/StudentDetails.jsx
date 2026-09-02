import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchStudentById } from "../../services/api/Api";
import { constants } from "../../global/constants";

const BASE_URL = constants.baseUrl;

const StudentDetails = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getStudent = async () => {
    try {
      const data = await fetchStudentById(id);
      setStudent(data);
    } catch (error) {
      console.error("Error loading student data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStudent();
  }, [id]);
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

  if (!student) {
    return <div className="p-4 text-center text-red-500">Student not found.</div>;
  }

  return (
    <div className="flex justify-center bg-gray-100 dark:bg-gray-900 min-h-screen mb-24 md:mb-10">
      <div className="p-6 w-screen h-screen">
        <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg">
          <div className="bgTheme text-white px-4 py-2 rounded-t-md flex items-center justify-between">
            <h2 className="text-3xl font-semibold capitalize">
              Student Profile - {student.first_name} {student.last_name}
            </h2>
          </div>

          <div className="p-6">
            <div className="mt-6">
              <div className="mt-2">
                {student.user_profile ? (
                  <img
                    src={`${BASE_URL}${student.user_profile.startsWith("/") ? "" : "/"}${student.user_profile}`}
                    alt="Profile"
                    className="w-24 h-24 object-cover border rounded-full"
                  />
                ) : (
                  <span className="italic text-gray-400 dark:text-gray-400">
                    No profile picture
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-dm text-gray-700 dark:text-gray-300 mt-6">
              <div className="capitalize">
                <strong>Full Name:</strong>
                <br />
                {`${student.first_name} ${student.middle_name} ${student.last_name}`.replace(
                  /\s+/g,
                  " "
                ).trim()}
              </div>
              <div>
                <strong>Email:</strong>
                <br />
                {student.email}
              </div>
              <div>
                <strong>Date of Birth:</strong>
                <br />
                {student.date_of_birth}
              </div>
              <div className="capitalize">
                <strong>Gender:</strong>
                <br />
                {student.gender}
              </div>
              <div className="capitalize">
                <strong>Blood Group:</strong>
                <br />
                {student.blood_group}
              </div>
              <div className="capitalize">
                <strong>Religion:</strong>
                <br />
                {student.religion}
              </div>
              <div>
                <strong>Category:</strong>
                <br />
                {student.category}
              </div>
              <div>
                <strong>Height:</strong>
                <br />
                {student.height} cm
              </div>
              <div>
                <strong>Weight:</strong>
                <br />
                {student.weight} kg
              </div>
              <div>
                <strong>Number of Siblings:</strong>
                <br />
                {student.number_of_siblings}
              </div>
              <div className="capitalize">
                <strong>Father's Name:</strong>
                <br />
                {student.father_name}
              </div>
              <div className="capitalize">
                <strong>Mother's Name:</strong>
                <br />
                {student.mother_name}
              </div>
            </div>

            <div className="flex justify-center p-8 gap-4 flex-wrap">
              <Link to={`/updateStudentdetail/${id}`}>
                <button
                  type="button"
                  className="btn btn-primary bgTheme min-w-[150px]"
                >
                  <i className="fa-solid fa-pen-to-square"></i> Update Profile
                </button>
              </Link>

              <Link
                to={`/studentAdmissionFees/${student.id}`}
                state={{
                  studentName: `${student.first_name} ${student.middle_name} ${student.last_name}`
                    .replace(/\s+/g, " ")
                    .trim(),
                  studentClass:
                    student.classes.length > 0 ? student.classes[0].name : "N/A",
                }}
              >
                <button
                  type="button"
                  className="btn btn-primary bgTheme min-w-[150px]"
                >
                  Fee Submission
                </button>
              </Link>

              <Link to={`/studentFeeCard/${student.id}`}>
                <button
                  type="button"
                  className="btn btn-primary bgTheme min-w-[150px]"
                >
                  Fee Card
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );



};

export default StudentDetails;



