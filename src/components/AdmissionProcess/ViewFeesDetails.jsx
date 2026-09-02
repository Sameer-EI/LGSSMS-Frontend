import React, { useContext, useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { toPng } from "html-to-image";
import img from "../../assets/logo.png";
import jsPDF from "jspdf";

export const ViewFeesDetails = () => {
  const { id, receipt_number } = useParams();
  const { axiosInstance } = useContext(AuthContext);
  const receiptRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [feeData, setFeeData] = useState(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  const getFeeSummaryData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axiosInstance.get(
        `/d/studentfees/get_receipt/?receipt_number=${receipt_number}`,
      );
      const data = response.data;
      if (data && data.receipt_number) {
        setFeeData(data);
      } else {
        setFeeData(null);
        setError("No fee record found for this student.");
      }
    } catch (err) {
      console.log(err);
      setError("Failed to load fee details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFeeSummaryData();
  }, [id, receipt_number]);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    if (dateString.includes(" ")) return dateString;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Print Function - Same as Marksheet component
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

  // PDF Download function (keep it if you want both)
  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setPrinting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: "#ffffff",
        style: {
          margin: "0",
          padding: "20px",
        },
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      let imgWidth = pageWidth - margin * 2;
      let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      if (imgHeight > pageHeight - margin * 2) {
        imgHeight = pageHeight - margin * 2;
        imgWidth = (imgProps.width * imgHeight) / imgProps.height;
      }

      const x = (pageWidth - imgWidth) / 2;
      const y = margin;

      pdf.addImage(dataUrl, "PNG", x, y, imgWidth, imgHeight);
      pdf.save(`receipt_${feeData.receipt_number || id}.pdf`);
    } catch (error) {
      console.error("PDF download failed:", error);
    } finally {
      setPrinting(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-4 rounded shadow">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!feeData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded shadow">
          <p>No fee details available for this receipt.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles - Same as Marksheet component */}
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
          .border, .border-gray-300, .border-gray-400 {
            border-color: #000 !important;
          }
          
          /* Ensure background colors print */
          .bg-print-green {
            background-color: #d1fae5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-gray {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .bg-print-white {
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .text-print-green {
            color: #065f46 !important;
          }
          
          .text-print-red {
            color: #dc2626 !important;
          }
          
          /* Ensure logo prints */
          .logoImg {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 py-8">
        <div
          id="print-area"
          ref={receiptRef}
          className="max-w-xl mx-auto border border-gray-300 p-6 bg-white shadow-lg"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <img src={img} alt="logo Not found" className="logoImg" />
              <div className="flex flex-col items-end">
                <h2 className="text-xl font-bold uppercase leading-tight text-center text-black">
                  New Progressive Education Public School
                </h2>
                <div className="mt-2 text-sm text-gray-700 text-center w-full">
                  <p className="leading-tight font-bold text-black">
                    Bhopal - 462 001
                  </p>
                  <p className="leading-tight font-bold text-black">
                    Tel.: 0755 2538456
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="text-sm mb-4 space-y-2 text-black">
            <div className="flex justify-between">
              <p className="text-black">
                Receipt No.:{" "}
                <span className="font-semibold text-print-red text-red-600">
                  {feeData.receipt_number || "--"}
                </span>
              </p>
              <p className="text-black">
                Date:{" "}
                <span className="font-semibold text-black">
                  {formatDate(feeData.date)}
                </span>
              </p>
            </div>

            <div>
              <p className="text-black">
                Child's Name:{" "}
                <span className="font-semibold capitalize text-black">
                  {feeData.child_name || "--"}
                </span>
              </p>
            </div>

            <div>
              <p className="text-black">
                Parent's Name:{" "}
                <span className="font-semibold capitalize text-black">
                  {feeData.parent_name || "Not Mentioned"}
                </span>
              </p>
            </div>

            <div>
              <p className="text-black">
                Months:{" "}
                <span className="font-semibold capitalize text-black">
                  {feeData.months || "--"}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-3">
              <p className="text-black">
                Grade:{" "}
                <span className="font-semibold text-black">
                  {feeData.grade || "Not Mentioned"}
                </span>
              </p>

              <p className="text-black">
                Section:{" "}
                <span className="font-semibold text-black">
                  {feeData.section || "Not Mentioned"}
                </span>
              </p>
            </div>
          </div>

          {/* Table with Particulars and Amount */}
          <table className="w-full text-sm border border-gray-400">
            <thead className="bg-print-gray bg-gray-100">
              <tr>
                <th className="border border-gray-400 p-2 text-left text-black">
                  Particulars
                </th>
                <th className="border border-gray-400 p-2 text-right text-black">
                  Amount (₹)
                </th>
              </tr>
            </thead>

            <tbody>
              {feeData.particulars && feeData.particulars.length > 0 ? (
                feeData.particulars.map((item, index) => (
                  <tr key={index} className="bg-print-white bg-white">
                    <td className="border border-gray-400 p-2 text-left text-black">
                      {item.particular}
                    </td>
                    <td className="border border-gray-400 p-2 text-right text-black">
                      {parseFloat(item.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2" className="border border-gray-400 p-2 text-center text-black">
                    No particulars available
                  </td>
                </tr>
              )}

              {/* Grand Total */}
              <tr className="bg-print-gray bg-gray-100">
                <td className="border border-gray-400 p-2 text-center font-semibold text-black">
                  Grand Total
                </td>
                <td className="border border-gray-400 p-2 text-right font-semibold text-black">
                  {parseFloat(feeData.grand_total || 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment Status */}
          <div className="mt-4 text-sm">
            <div className="flex justify-between items-center border-t border-gray-300 pt-3">
              <p className="text-black">
                <strong>Payment Status:</strong>
              </p>
              <span className="text-sm font-semibold px-3 py-1 rounded bg-print-green bg-green-100 text-print-green text-green-700">
                ✅ Paid
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm mt-4 text-black border-t border-gray-300 pt-3">
            <p className="text-black">
              <strong className="text-black">Paid by:</strong>{" "}
              {feeData.payment_mode || "--"}
            </p>
            <p className="text-black text-xs mt-1">
              Fees once paid are neither refundable nor transferable.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              This is a computer generated receipt. No signature is required.
            </p>
          </div>
        </div>

        {/* Action Buttons - Hidden when printing */}
        <div className="max-w-xl mx-auto flex justify-end gap-3 mb-24 md:mb-20 mt-3 no-print">
          <button
            onClick={handlePrint}
            disabled={printing}
            className="btn bgTheme text-white px-6 py-2 rounded hover:opacity-90 transition-opacity"
          >
            {printing ? "Preparing..." : "🖨️ Print"}
          </button>
          {/* <button
            onClick={handleDownload}
            disabled={printing}
            className="btn bgTheme text-white px-6 py-2 rounded hover:opacity-90 transition-opacity"
          >
            {printing ? "Preparing..." : "📄 Save PDF"}
          </button> */}
        </div>
      </div>
    </>
  );
};