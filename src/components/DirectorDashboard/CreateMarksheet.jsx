import React, { useContext, useEffect, useRef, useState } from 'react'
import { fetchSchoolYear, fetchStudents1, fetchTerms, fetchYearLevels } from '../../services/api/Api';
import { useForm } from 'react-hook-form';
import { AuthContext } from '../../context/AuthContext';
import { constants } from "../../global/constants";

const BASE_URL = constants.baseUrl;
import axios from 'axios';

export const CreateMarksheet = () => {
    const { axiosInstance } = useContext(AuthContext);

    const [className, setClassName] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [searchStudentInput, setSearchStudentInput] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const [selectedStudentName, setSelectedStudentName] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [uploadedFile, setUploadedFile] = useState(null);

    const studentDropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    const {
        register,
        handleSubmit,
        setValue,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm();

    // Watch required fields
    const watchedFields = watch(['year_level', 'student']);
    const yearLevelValue = watch('year_level');
    const studentValue = watch('student');

    // Fetch all classes
    const getClassName = async () => {
        try {
            const ClassName = await fetchYearLevels();
            setClassName(ClassName);
        } catch (err) {
            console.log("Failed to load classes. Please try again." + err);
        }
    };

    // Fetch Students
    const getStudents = async (classId) => {
        setLoadingStudents(true);
        try {
            const Students = await fetchStudents1(classId);
            setStudents(Students);
            console.log(Students);
        } catch (err) {
            console.log("Failed to load students. Please try again." + err);
        } finally {
            setLoadingStudents(false);
        }
    };

    useEffect(() => {
        getClassName();
    }, [])

    const handleClassChange = (e) => {
        const classId = e.target.value;
        setSelectedClassId(classId);
        setSelectedStudentId("");
        setSelectedStudentName("");
        setValue("student", "");
    };

    useEffect(() => {
        if (selectedClassId) {
            getStudents(selectedClassId);
        } else {
            setStudents([]);
        }
    }, [selectedClassId]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target)) {
                setShowStudentDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle file upload
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setUploadedFile(file);
        }
    };

    // Remove uploaded file
    const handleRemoveFile = () => {
        setUploadedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Check if all required fields are filled
    const formReady =
        yearLevelValue &&
        studentValue &&
        uploadedFile &&
        !errors.year_level &&
        !errors.student;

    const filteredStudents = students
        .filter((studentObj) =>
            studentObj.student_name.toLowerCase().includes(searchStudentInput.toLowerCase())
        )
        .sort((a, b) => a.student_name.localeCompare(b.student_name));

    const onSubmit = async (data) => {
        try {
            const formData = new FormData();
            formData.append('student', selectedStudentId);
            formData.append('year_level', data.year_level);
            formData.append('file', uploadedFile);

            const response = await axiosInstance.post("/d/report-cards/", formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            // If API returns a success message, show it
            const apiMessage = response.data?.message || "Marksheet created successfully!";
            setSuccessMessage(apiMessage);
            setShowSuccessModal(true);

            // Reset form
            reset();
            setUploadedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSelectedStudentId("");
            setSelectedStudentName("");
            setSelectedClassId(null);

        } catch (error) {
            console.error("Failed to submit marksheet:", error);

            const apiMessage = error.response?.data?.error || error.response?.data?.message || "Failed to create marksheet. Please try again.";

            setErrorMessage(apiMessage);
            setShowErrorModal(true);
        }
    };


    // Helper function to get missing required fields
    const getMissingFields = () => {
        const missing = [];
        if (!yearLevelValue) missing.push("Year Level");
        if (!studentValue) missing.push("Student");
        if (!uploadedFile) missing.push("Document");
        return missing;
    };

    const missingFields = getMissingFields();

    return (
        <div className="min-h-screen p-5 bg-gray-50 dark:bg-gray-900 mb-24 md:mb-10">
            <div className="w-full max-w-7xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-box my-5 shadow-sm dark:shadow-gray-700">
                <h1 className="text-3xl font-bold text-center mb-8 text-gray-800 dark:text-gray-100">
                    <i className="fa-solid fa-file-pen ml-2"></i>  Create Marksheet
                </h1>

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Main Grid Container for All Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Required Section Header */}
                        <div className="col-span-full">
                            <h3 className="text-xl font-semibold mb-2 text-gray-700 dark:text-gray-300 border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                                Required Information
                            </h3>
                        </div>

                        {/* Year Level */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Year Level <span className="text-red-500">*</span>
                            </label>
                            <select
                                {...register("year_level", { required: "Year level is required" })}
                                onChange={handleClassChange}
                                className="select select-bordered w-full focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100 border-gray-300 dark:border-gray-600"
                            >
                                <option value="">Select Year Level</option>
                                {className?.map((level) => (
                                    <option key={level.id} value={level.id}>
                                        {level.level_name}
                                    </option>
                                ))}
                            </select>
                            {errors.year_level && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.year_level.message}
                                </p>
                            )}
                        </div>

                        {/* Student */}
                        <div className="relative" ref={studentDropdownRef}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Student <span className="text-red-500">*</span>
                            </label>
                            <div
                                className="select select-bordered w-full flex items-center justify-between cursor-pointer bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                onClick={() => setShowStudentDropdown(!showStudentDropdown)}
                            >
                                <span className={selectedStudentName ? "" : "text-gray-400"}>
                                    {selectedStudentName || "Select Student"}
                                </span>
                            </div>

                            <input
                                type="hidden"
                                {...register("student", { required: "Student is required" })}
                                value={selectedStudentId || ""}
                            />

                            {showStudentDropdown && (
                                <div className="absolute z-50 bg-white dark:bg-gray-700 rounded-lg w-full mt-1 shadow-xl border border-gray-300 dark:border-gray-600">
                                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                        <input
                                            type="text"
                                            placeholder="Search Student..."
                                            className="input input-sm input-bordered w-full focus:outline-none bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                            value={searchStudentInput}
                                            onChange={(e) => setSearchStudentInput(e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {loadingStudents ? (
                                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                Loading students...
                                            </div>
                                        ) : filteredStudents.length > 0 ? (
                                            filteredStudents.map((studentObj) => (
                                                <div
                                                    key={studentObj.student_id}
                                                    className="p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-800 dark:text-gray-200 capitalize border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                                                    onClick={() => {
                                                        setSelectedStudentId(studentObj.student_id);
                                                        setSelectedStudentName(studentObj.student_name + " " + studentObj.scholar_number);
                                                        setSearchStudentInput("");
                                                        setShowStudentDropdown(false);
                                                        setValue("student", studentObj.student_id, { shouldValidate: true });
                                                    }}
                                                >
                                                    {studentObj.student_name + " " + studentObj.scholar_number}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                                                No students found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {errors.student && (
                                <p className="text-red-500 text-xs mt-1">
                                    {errors.student.message}
                                </p>
                            )}
                        </div>

                        {/* Document Upload */}
                        <div className="col-span-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Upload Document <span className="text-red-500">*</span>
                            </label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="file-upload"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                />

                                {!uploadedFile ? (
                                    <div>
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer inline-flex items-center px-4 py-2 bgTheme text-white rounded-lg hover:bg-opacity-90 transition-colors"
                                        >
                                            <i className="fa-solid fa-cloud-arrow-up mr-2"></i>
                                            Choose File
                                        </label>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            PDF, DOC, DOCX, JPG, PNG (Max: 10MB)
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                        <div className="flex items-center">
                                            <i className="fa-solid fa-file text-blue-500 text-xl mr-3"></i>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    {uploadedFile.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            className="text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                )}
                            </div>
                            {!uploadedFile && (
                                <p className="text-red-500 text-xs mt-1">
                                    Please upload a document
                                </p>
                            )}
                        </div>

                        {/* Submit Button with Status */}
                        <div className="col-span-full mt-8">
                            <div className="flex flex-col items-center gap-4">
                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className={`btn bgTheme text-white px-8 py-3 transition-all ${formReady
                                        ? ' hover:bg-opacity-90'
                                        : 'opacity-50 cursor-not-allowed'
                                        }`}
                                    disabled={isSubmitting || !formReady}
                                    title={!formReady ? `Please fill in: ${missingFields.join(", ")}` : "Submit Marksheet"}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin mr-2"></i>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-paper-plane mr-2"></i>
                                            Submit Marksheet
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box bg-white dark:bg-gray-800">
                        <div className="text-center">
                            <i className="fa-solid fa-circle-check text-5xl text-green-500 mb-4"></i>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">
                                Success!
                            </h3>
                            <p className="py-1 text-gray-600 dark:text-gray-300">
                                {successMessage}
                            </p>
                        </div>
                        <div className="modal-action justify-center">
                            <button
                                className="btn w-32 bgTheme text-white"
                                onClick={() => setShowSuccessModal(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Error Modal */}
            {showErrorModal && (
                <dialog className="modal modal-open">
                    <div className="modal-box bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                        <h3 className="font-bold text-lg py-1">CreateMarksheet</h3>
                        <p className="py-6">
                            {errorMessage}
                        </p>
                        <div className="modal-action">
                            <button
                                className="btn bgTheme text-white w-30"
                                onClick={() => setShowErrorModal(false)}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </div>
    )
}