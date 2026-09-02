import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const Marksheet = () => {
  const printRef = useRef();
  const { id } = useParams();
  const [marksheet, setMarksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { axiosInstance } = useContext(AuthContext);
  const [printing, setPrinting] = useState(false);

  // Hardcoded static fields (since they are not available in the provided JSON)
  const hardcodedFields = {
    sssmId: "1727456484",
    aadhaarNo: "89675475854",
    penNo: "21258294654",
    aapaarId: "124748344697",
  };

  const getMarksheet = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) throw new Error("No id available");

      const response = await axiosInstance.get(`/d/report-cards/${id}/`);
      setMarksheet(response.data);
    } catch (err) {
      console.error("Failed to load marksheet:", err);
      setError(err.message || "Failed to load marksheet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMarksheet();
  }, [id]);

  // Print Function
  const handlePrint = async () => {
    setPrinting(true);
    try {
      await new Promise((res) => setTimeout(res, 300));
      window.print();
    } catch (err) {
      console.error("Print failed:", err);
    } finally {
      setPrinting(false);
    }
  };

  const safeString = (value) =>
    value === null || value === undefined || value === "null" || value === ""
      ? "—"
      : value;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-3 h-3 bgTheme rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
        <p className="mt-2 text-gray-500 dark:text-gray-300 text-sm">
          Loading data...
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

  if (!marksheet) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white dark:bg-gray-100">
        <p className="text-gray-600">No marksheet data available</p>
      </div>
    );
  }

  const data = marksheet;

  // Get all unique subjects from all exam types
  const allSubjects = Array.from(
    new Set(
      data.subjects.flatMap((exam) =>
        exam.subjects ? Object.keys(exam.subjects) : []
      )
    )
  ).sort();

  // Helper to get exam-specific data
  const getExamData = (examType) =>
    data.subjects.find((e) => e.exam_type === examType);

  // Get subject scores safely for all exams and average
  const getSubjectScores = (subjectName) => {
    const fa1 = getExamData("FA1")?.subjects?.[subjectName] ?? "-";
    const fa2 = getExamData("FA2")?.subjects?.[subjectName] ?? "-";
    const sa1 = getExamData("SA1")?.subjects?.[subjectName] ?? "-";
    const fa3 = getExamData("FA3")?.subjects?.[subjectName] ?? "-";
    const sa2 = getExamData("SA2")?.subjects?.[subjectName] ?? "-";

    let avg = "-";
    if (
      data.subject_avg &&
      typeof data.subject_avg === "object" &&
      !data.subject_avg.error
    ) {
      avg = data.subject_avg[subjectName] ?? "-";
    }

    const formatScore = (score) => {
      if (typeof score === "number") {
        return score % 1 !== 0 ? score.toFixed(2) : score;
      }
      return score;
    };

    return [
      formatScore(fa1),
      formatScore(fa2),
      formatScore(sa1),
      formatScore(fa3),
      formatScore(sa2),
      formatScore(avg),
    ];
  };

  return (
    <>
      {/* Print Styles - Injected directly in component */}
      <style>{`
        @media print {
          /* Hide everything except the print area */
          body * {
            visibility: hidden;
          }
          
          #print-area, #print-area * {
            visibility: visible;
          }
          
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white;
            border: none !important;
          }
          
          /* Hide the print button */
          .no-print {
            display: none !important;
          }
          
          /* Ensure borders print properly */
          table, th, td {
            border-color: #000 !important;
          }
          
          /* Ensure background colors print */
          .bg-print-yellow {
            background-color: #fbbf24 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-blue {
            background-color: #dbeafe !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-gray {
            background-color: #e5e7eb !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-white {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-red {
            background-color: #b91c1c !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .text-print-red {
            color: #b91c1c !important;
          }
          
          .text-print-blue {
            color: #1e40af !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 min-h-screen p-2 sm:p-4 md:p-6 pb-24 md:pb-10">
        <div className="flex flex-col items-center">
          <div className="w-full overflow-x-auto flex flex-col items-center">
            <div 
              id="print-area"
              ref={printRef} 
              className="w-max max-w-none mx-auto border-2 sm:border-3 border-[#b91c1c] p-2 sm:p-3 md:p-4 bg-white font-sans text-xs sm:text-sm m-2 sm:m-4"
            >
              {/* Header */}
              <div className="border-2 border-black">
                <div className="flex items-center justify-start bg-[#fbbf24] bg-print-yellow border-b-2 border-black px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 relative">
                  <div className="absolute -left-2 sm:-left-2.5 md:-left-3 top-1/2 transform -translate-y-1/2 rotate-45 w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 bg-[#b91c1c] bg-print-red flex items-center justify-center border border-black z-0 ml-2 sm:ml-4 md:ml-8">
                    <span className="rotate-[315deg] text-[#fde047] font-extrabold text-sm sm:text-xl md:text-4xl">
                      4S
                    </span>
                  </div>
                  <div className="flex-1 text-center ml-8 sm:ml-14 md:ml-18">
                    <h1 className="text-sm sm:text-lg md:text-2xl font-extrabold uppercase text-[#b91c1c] text-print-red tracking-tight sm:tracking-wider leading-tight">
                      New Progressive Education Public School
                    </h1>
                  </div>
                </div>

                <div className="px-2 sm:px-3 py-0.5">
                  <p className="text-[9px] sm:text-xxs md:text-xs text-black ml-12 sm:ml-24 md:ml-32 font-bold leading-tight sm:leading-normal">
                    10, Prince Colony, Behind Old Civil Court, Lower Idgah Hills, Bhopal
                  </p>
                </div>

                <div className="text-center py-1 bg-[#dbeafe] bg-print-blue text-[#1e40af] text-print-blue font-bold tracking-wider text-xs sm:text-sm border-t border-[#374151]">
                  ANNUAL RESULT {safeString(data.academic_year)}
                </div>
              </div>

              {/* Student Info */}
              <div className="border border-black text-[9px] sm:text-xxs md:text-xs font-sans mt-2 sm:mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-0">
                  {/* Row 1 */}
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Name:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      {safeString(data.student_name)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Scholar No.:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide border border-black px-0.5 sm:px-1 py-0.5 ml-0.5 rounded-sm bg-white bg-print-white">
                      {safeString(data.scholar_number)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      SSSM ID:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      {hardcodedFields.sssmId}
                    </span>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Father's Name:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      Mr. {safeString(data.father_name)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Class:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide border border-black px-0.5 sm:px-1 py-0.5 ml-0.5 rounded-sm bg-white bg-print-white">
                      {safeString(data.standard)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Aadhaar No.:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      {hardcodedFields.aadhaarNo}
                    </span>
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Mother's Name:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      Mrs. {safeString(data.mother_name)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      DOB:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide border border-black px-0.5 sm:px-1 py-0.5 ml-0.5 rounded-sm bg-white bg-print-white">
                      {data.date_of_birth
                        ? new Date(data.date_of_birth).toLocaleDateString("en-GB")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Pen No.:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      {hardcodedFields.penNo}
                    </span>
                  </div>

                  {/* Row 4 */}
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1 sm:col-span-2 lg:col-span-1">
                    <span className="w-[40%] sm:w-[45%] text-black tracking-tight font-bold">
                      Mobile No.:
                    </span>
                    <span className="w-[60%] sm:w-[55%] text-[#1f2937] italic font-medium tracking-wide">
                      {safeString(data.contact_number)}
                    </span>
                  </div>
                  <div className="flex items-center border-b border-black px-1 sm:px-2 py-0.5 sm:py-1 sm:col-span-2 lg:col-span-2">
                    <span className="w-[20%] sm:w-[22.5%] text-black tracking-tight font-bold">
                      Aapaar ID:
                    </span>
                    <span className="w-[80%] sm:w-[77.5%] text-[#1f2937] italic font-medium tracking-wide">
                      {hardcodedFields.aapaarId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scholastic Table */}
              <div className="mb-2 sm:mb-3 md:mb-4 mt-2 sm:mt-3">
                <h2 className="text-center bg-[#dbeafe] bg-print-blue text-[#1e40af] text-print-blue font-bold tracking-wider text-xs sm:text-sm border-t border-b border-[#374151] py-1">
                  Scholastic Evaluation
                </h2>
                <div className="w-full">
                  <table className="w-full border border-black text-[9px] sm:text-xxs md:text-xs text-center border-collapse min-w-[800px]">
                    <thead className="bg-[#e5e7eb] bg-print-gray">
                      <tr>
                        {[
                          "Subject",
                          "FA1",
                          "FA2",
                          "SA1",
                          "FA3",
                          "SA2",
                          "Avg SA1+SA2",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allSubjects.map((subject) => {
                        const [fa1, fa2, sa1, fa3, sa2, avg] =
                          getSubjectScores(subject);
                        return (
                          <tr key={subject} className="bg-white bg-print-white">
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 text-center text-[#dc2626] font-bold whitespace-nowrap">
                              {subject.toUpperCase()}
                            </td>
                            {[fa1, fa2, sa1, fa3, sa2, avg].map((score, idx) => (
                              <td
                                key={idx}
                                className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black"
                              >
                                {score}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      
                      {/* Summary Rows */}
                      {["TOTAL", "PERCENTAGE", "GRADE", "RANK", "ATTENDANCE", "DIVISION"].map((rowLabel, rowIndex) => (
                        <tr key={rowLabel} className="bg-white bg-print-white">
                          <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 text-center text-[#dc2626] font-bold whitespace-nowrap">
                            {rowLabel}
                          </td>
                          {["FA1", "FA2", "SA1", "FA3", "SA2"].map((exam) => {
                            const examData = getExamData(exam);
                            switch(rowLabel) {
                              case "TOTAL":
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {safeString(examData?.total_obtained)}/
                                    {safeString(examData?.total_possible)}
                                  </td>
                                );
                              case "PERCENTAGE":
                                const percentage = safeString(examData?.percentage);
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {percentage !== "—" ? `${percentage}%` : percentage}
                                  </td>
                                );
                              case "GRADE":
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {safeString(examData?.grade)}
                                  </td>
                                );
                              case "RANK":
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {safeString(examData?.rank)}
                                  </td>
                                );
                              case "ATTENDANCE":
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {safeString(examData?.attendance)}
                                  </td>
                                );
                              case "DIVISION":
                                return (
                                  <td key={exam} className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                                    {safeString(examData?.division)}
                                  </td>
                                );
                              default:
                                return null;
                            }
                          })}
                          <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            {rowLabel === "TOTAL" ? `${safeString(data.total_marks)}/${safeString(data.max_marks)}` :
                             rowLabel === "PERCENTAGE" ? `${safeString(data.percentage)}%` :
                             safeString(data[rowLabel.toLowerCase()])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-Scholastic & Personal/Social */}
              <div className="mb-2 sm:mb-3 md:mb-4">
                <h2 className="text-center bg-[#dbeafe] bg-print-blue text-[#1e40af] text-print-blue font-bold tracking-wider text-xs sm:text-sm border-t border-b border-[#374151] py-1">
                  <span className="block sm:inline">NON-SCHOLASTIC EVALUATION</span>
                  <span className="hidden sm:inline mx-4">|</span>
                  <span className="block sm:inline mt-1 sm:mt-0">PERSONAL & SOCIAL QUALITIES</span>
                </h2>
                
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 mt-2 sm:mt-3 min-w-[800px]">
                  {/* Non-Scholastic Table */}
                  <div className="flex-1">
                    <table className="w-full text-[9px] sm:text-xxs md:text-xs border border-black text-center border-collapse">
                      <thead className="bg-[#e5e7eb] bg-print-gray">
                        <tr>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            SUBJECT
                          </th>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            I Term
                          </th>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            II Term
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          "GK/Moral/EVS",
                          "Conversation",
                          "Computer",
                          "Drawing/Craft",
                        ].map((subj) => (
                          <tr key={subj} className="bg-white bg-print-white">
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 text-left text-black">
                              {subj}
                            </td>
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 font-bold text-black">
                              {safeString(
                                data.non_scholastic.find(
                                  (item) =>
                                    item.subject === subj && item.term === "Term 1"
                                )?.grade
                              )}
                            </td>
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 font-bold text-black">
                              {safeString(
                                data.non_scholastic.find(
                                  (item) =>
                                    item.subject === subj && item.term === "Term 2"
                                )?.grade
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Personal & Social Table */}
                  <div className="flex-1">
                    <table className="w-full text-[9px] sm:text-xxs md:text-xs border border-black border-collapse">
                      <thead className="bg-[#e5e7eb] bg-print-gray">
                        <tr>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            SUBJECT
                          </th>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            I Term
                          </th>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            II Term
                          </th>
                          <th className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 whitespace-nowrap text-black">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          "Cleanliness",
                          "Discipline",
                          "Punctuality",
                          "Attention In Class",
                        ].map((trait, index) => (
                          <tr key={trait} className="bg-white bg-print-white">
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 text-left text-black">
                              {trait}
                            </td>
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 font-bold text-center text-black">
                              {safeString(
                                data.personal_social.find(
                                  (item) =>
                                    item.quality === trait && item.term === "Term 1"
                                )?.grade
                              )}
                            </td>
                            <td className="border border-black px-1 py-0.5 sm:px-2 sm:py-1 font-bold text-center text-black">
                              {safeString(
                                data.personal_social.find(
                                  (item) =>
                                    item.quality === trait && item.term === "Term 2"
                                )?.grade
                              )}
                            </td>
                            {index === 0 && (
                              <td
                                className="border border-black p-1 text-left align-top text-[8px] sm:text-xs italic text-black"
                                rowSpan={4}
                              >
                                {safeString(data.teacher_remark)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t-2 border-black pt-2 sm:pt-3 text-[9px] sm:text-xxs md:text-xs mt-2 sm:mt-3 min-w-[800px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="text-black">
                    <strong>Pass/Promoted to Class:</strong>{" "}
                    {safeString(data.promoted_to_class)}
                  </div>
                  <div className="text-black">
                    <strong>Supplementary In:</strong>{" "}
                    {data.supplementary_in && data.supplementary_in.length > 0
                      ? data.supplementary_in.join(", ")
                      : "—"}
                  </div>
                  <div className="text-black">
                    <strong>School Re-opens on:</strong>{" "}
                    {data.school_reopen_date
                      ? new Date(data.school_reopen_date).toLocaleDateString("en-GB")
                      : "—"}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 text-center pt-2 sm:pt-4 border-t border-[#9ca3af] font-semibold text-[#b91c1c] text-print-red gap-3 sm:gap-0">
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-[#b91c1c] text-print-red">Sign of Class Teacher</p>
                    <div className="h-12 sm:h-16 md:h-22 mx-auto flex items-end justify-center border-b-2 border-[#d1d5db] pb-1">
                      <span className="text-[#9ca3af] text-[8px] sm:text-xs">
                        (Signature Area)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-[#b91c1c] text-print-red">Sign of Principal</p>
                    <div className="h-12 sm:h-16 md:h-22 mx-auto flex items-end justify-center border-b-2 border-[#d1d5db] pb-1">
                      <span className="text-[#9ca3af] text-[8px] sm:text-xs">
                        (Signature Area)
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs sm:text-sm text-[#b91c1c] text-print-red">Parent's/Guardian's Sign</p>
                    <div className="h-12 sm:h-16 md:h-22 mx-auto flex items-end justify-center border-b-2 border-[#d1d5db] pb-1">
                      <span className="text-[#9ca3af] text-[8px] sm:text-xs">
                        (Signature Area)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Print Button - Hidden when printing */}
          <div className="md:mt-4 md:mb-10 mt-6 no-print">
            <div className="flex justify-center">
              <button
                onClick={handlePrint}
                disabled={printing}
                className="btn bgTheme text-white px-6 py-2 rounded-md hover:opacity-80 transition-opacity"
              >
                {printing ? "Preparing..." : "🖨️ Print Marksheet"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Marksheet;