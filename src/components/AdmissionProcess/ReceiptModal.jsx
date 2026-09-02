// import React, { useRef } from 'react';
// import img from "../../assets/logo.png";

// const ReceiptModal = ({ receiptData, onClose, isLoading }) => {
//   const receiptRef = useRef();

//   const handlePrint = () => {
//     const printContent = receiptRef.current;
//     if (!printContent) return;

//     const printWindow = window.open('', '_blank', 'width=800,height=600');
//     if (!printWindow) {
//       alert('Please allow pop-ups to print the receipt');
//       return;
//     }

//     const styles = `
//       <style>
//         * {
//           margin: 0;
//           padding: 0;
//           box-sizing: border-box;
//         }
        
//         body {
//           font-family: Arial, Helvetica, sans-serif;
//           background: white;
//           padding: 20px;
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           min-height: 100vh;
//         }
        
//         .receipt-container {
//           max-width: 600px;
//           width: 100%;
//           padding: 20px;
//           border: 1px solid #ddd;
//           background: white;
//         }
        
//         .header {
//           display: flex;
//           align-items: center;
//           justify-content: space-between;
//           margin-bottom: 20px;
//           border-bottom: 2px solid #000;
//           padding-bottom: 10px;
//         }
        
//         .header img {
//           width: 60px;
//           height: 60px;
//           object-fit: contain;
//         }
        
//         .header-right {
//           display: flex;
//           flex-direction: column;
//           align-items: flex-end;
//         }
        
//         .header-right h2 {
//           font-size: 18px;
//           font-weight: bold;
//           text-transform: uppercase;
//           color: #000;
//           text-align: center;
//         }
        
//         .header-right .address {
//           font-size: 12px;
//           font-weight: bold;
//           color: #000;
//           text-align: center;
//           margin-top: 4px;
//         }
        
//         .header-right .phone {
//           font-size: 12px;
//           font-weight: bold;
//           color: #000;
//           text-align: center;
//         }
        
//         .receipt-info {
//           display: flex;
//           justify-content: space-between;
//           font-size: 13px;
//           margin-bottom: 15px;
//           color: #000;
//         }
        
//         .receipt-info strong {
//           font-weight: bold;
//         }
        
//         .student-details {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 4px 20px;
//           margin-bottom: 15px;
//           padding: 8px 10px;
//           background: #f9f9f9;
//           font-size: 13px;
//         }
        
//         .student-details .label {
//           font-weight: bold;
//           color: #000;
//         }
        
//         .student-details .value {
//           text-align: right;
//           color: #000;
//         }
        
//         .fee-table {
//           width: 100%;
//           border-collapse: collapse;
//           margin: 10px 0;
//           font-size: 13px;
//         }
        
//         .fee-table th {
//           background: #f0f0f0;
//           border: 1px solid #999;
//           padding: 8px 10px;
//           text-align: left;
//           font-weight: bold;
//           color: #000;
//         }
        
//         .fee-table td {
//           border: 1px solid #999;
//           padding: 8px 10px;
//           color: #000;
//         }
        
//         .fee-table .amount-col {
//           text-align: right;
//         }
        
//         .grand-total {
//           display: flex;
//           justify-content: space-between;
//           padding: 8px 10px;
//           border-top: 2px solid #000;
//           margin-top: 5px;
//           font-size: 14px;
//           font-weight: bold;
//           color: #000;
//           background: #f0f0f0;
//         }
        
//         .payment-method {
//           font-size: 13px;
//           margin-top: 8px;
//           padding: 5px 0;
//           color: #000;
//         }
        
//         .payment-method strong {
//           font-weight: bold;
//         }
        
//         .footer-text {
//           margin-top: 15px;
//           padding-top: 10px;
//           border-top: 1px solid #ddd;
//           font-size: 12px;
//           color: #000;
//         }
        
//         .footer-text p {
//           margin: 2px 0;
//         }
        
//         .footer-text .note {
//           color: #666;
//           font-size: 10px;
//         }
        
//         .no-print {
//           display: none;
//         }
        
//         @media print {
//           body {
//             padding: 0;
//             background: white;
//           }
          
//           .receipt-container {
//             border: none !important;
//             padding: 15px;
//             max-width: 100%;
//           }
          
//           .student-details {
//             background: #f9f9f9 !important;
//             -webkit-print-color-adjust: exact !important;
//             print-color-adjust: exact !important;
//           }
          
//           .fee-table th {
//             background: #f0f0f0 !important;
//             -webkit-print-color-adjust: exact !important;
//             print-color-adjust: exact !important;
//           }
          
//           .grand-total {
//             background: #f0f0f0 !important;
//             -webkit-print-color-adjust: exact !important;
//             print-color-adjust: exact !important;
//           }
//         }
//       </style>
//     `;

//     const receiptHTML = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Receipt - ${receiptData?.receipt_number || ''}</title>
//         ${styles}
//       </head>
//       <body>
//         <div class="receipt-container">
//           <!-- Header with Logo -->
//           <div class="header">
//             <img src="${img}" alt="logo" />
//             <div class="header-right">
//               <h2>New Progressive Education Public School</h2>
//               <div class="address">Bhopal - 462 001</div>
//               <div class="phone">Tel.: 0755 2538456</div>
//             </div>
//           </div>

//           <!-- Receipt Info -->
//           <div class="receipt-info">
//             <span><strong>Receipt No.:</strong> ${receiptData?.receipt_number || ''}</span>
//             <span><strong>Date:</strong> ${receiptData?.date || ''}</span>
//           </div>

//           <!-- Student Details -->
//           <div class="student-details">
//             <span class="label">Child's Name:</span>
//             <span class="value">${receiptData?.child_name || ''}</span>
//             <span class="label">Parent's Name:</span>
//             <span class="value">${receiptData?.parent_name || ''}</span>
//             <span class="label">Month:</span>
//             <span class="value">${receiptData?.months || 'N/A'}</span>
//             <span class="label">Grade:</span>
//             <span class="value">${receiptData?.grade || ''}</span>
//             <span class="label">Section:</span>
//             <span class="value">${receiptData?.section || 'Not Mentioned'}</span>
//           </div>

//           <!-- Fee Table -->
//           <table class="fee-table">
//             <thead>
//               <tr>
//                 <th>Particulars</th>
//                 <th class="amount-col">Amount (Rs.)</th>
//               </tr>
//             </thead>
//             <tbody>
//               ${receiptData?.particulars?.map(item => `
//                 <tr>
//                   <td>${item.particular}</td>
//                   <td class="amount-col">${parseFloat(item.amount).toFixed(2)}/-</td>
//                 </tr>
//               `).join('') || ''}
//             </tbody>
//           </table>

//           <!-- Grand Total -->
//           <div class="grand-total">
//             <span>Grand Total</span>
//             <span>${parseFloat(receiptData?.grand_total || 0).toFixed(2)}/-</span>
//           </div>

//           <!-- Payment Method -->
//           <div class="payment-method">
//             <strong>Paid by:</strong> ${receiptData?.payment_method || 'cash'}
//           </div>

//           <!-- Footer -->
//           <div class="footer-text">
//             <p>Fees once paid are neither refundable nor transferable.</p>
//             <p class="note">This is a computer generated receipt. No signature is required.</p>
//           </div>
//         </div>
        
//         <div style="text-align: center; margin-top: 20px;" class="no-print">
//           <button onclick="window.print()" style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;">
//             🖨️ Print Receipt
//           </button>
//           <button onclick="window.close()" style="padding: 10px 30px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;">
//             ✖ Close
//           </button>
//         </div>
//       </body>
//       </html>
//     `;

//     printWindow.document.write(receiptHTML);
//     printWindow.document.close();
    
//     setTimeout(() => {
//       printWindow.print();
//     }, 500);
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
//         <div className="p-6">
//           <div className="flex justify-between items-center mb-4 border-b pb-3">
//             <h2 className="text-xl font-bold text-gray-800">Payment Receipt</h2>
//             <button
//               onClick={onClose}
//               className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
//             >
//               ×
//             </button>
//           </div>

//           {isLoading ? (
//             <div className="flex justify-center py-12">
//               <div className="flex space-x-2">
//                 <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
//                 <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
//                 <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
//               </div>
//             </div>
//           ) : (
//             <>
//               {/* Receipt Content - Same as ViewFeesDetails */}
//               <div ref={receiptRef} className="border border-gray-300 p-6 bg-white">
//                 {/* Header with Logo */}
//                 <div className="mb-6">
//                   <div className="flex items-center justify-between">
//                     <img src={img} alt="logo" className="w-16 h-16 object-contain" />
//                     <div className="flex flex-col items-end">
//                       <h2 className="text-xl font-bold uppercase leading-tight text-center text-black">
//                         New Progressive Education Public School
//                       </h2>
//                       <div className="mt-2 text-sm text-gray-700 text-center w-full">
//                         <p className="leading-tight font-bold text-black">Bhopal - 462 001</p>
//                         <p className="leading-tight font-bold text-black">Tel.: 0755 2538456</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Receipt Info */}
//                 <div className="text-sm mb-4 space-y-2 text-black">
//                   <div className="flex justify-between">
//                     <p className="text-black">
//                       Receipt No.:{" "}
//                       <span className="font-semibold text-red-600">
//                         {receiptData?.receipt_number || "--"}
//                       </span>
//                     </p>
//                     <p className="text-black">
//                       Date:{" "}
//                       <span className="font-semibold text-black">
//                         {receiptData?.date || "--"}
//                       </span>
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-black">
//                       Child's Name:{" "}
//                       <span className="font-semibold capitalize text-black">
//                         {receiptData?.child_name || "--"}
//                       </span>
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-black">
//                       Parent's Name:{" "}
//                       <span className="font-semibold capitalize text-black">
//                         {receiptData?.parent_name || "Not Mentioned"}
//                       </span>
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-black">
//                       Months:{" "}
//                       <span className="font-semibold capitalize text-black">
//                         {receiptData?.months || "--"}
//                       </span>
//                     </p>
//                   </div>

//                   <div className="grid grid-cols-3">
//                     <p className="text-black">
//                       Grade:{" "}
//                       <span className="font-semibold text-black">
//                         {receiptData?.grade || "Not Mentioned"}
//                       </span>
//                     </p>

//                     <p className="text-black">
//                       Section:{" "}
//                       <span className="font-semibold text-black">
//                         {receiptData?.section || "Not Mentioned"}
//                       </span>
//                     </p>
//                   </div>
//                 </div>

//                 {/* Fee Table */}
//                 <table className="w-full text-sm border border-gray-400">
//                   <thead className="bg-gray-100">
//                     <tr>
//                       <th className="border border-gray-400 p-2 text-left text-black">
//                         Particulars
//                       </th>
//                       <th className="border border-gray-400 p-2 text-right text-black">
//                         Amount (Rs.)
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {receiptData?.particulars?.map((item, index) => (
//                       <tr key={index}>
//                         <td className="border border-gray-400 p-2 text-left text-black">
//                           {item.particular}
//                         </td>
//                         <td className="border border-gray-400 p-2 text-right text-black">
//                           {parseFloat(item.amount).toFixed(2)}/-
//                         </td>
//                       </tr>
//                     ))}
//                     {/* Grand Total Row */}
//                     <tr className="bg-gray-100">
//                       <td className="border border-gray-400 p-2 text-center font-semibold text-black">
//                         Grand Total
//                       </td>
//                       <td className="border border-gray-400 p-2 text-right font-semibold text-black">
//                         {parseFloat(receiptData?.grand_total || 0).toFixed(2)}/-
//                       </td>
//                     </tr>
//                   </tbody>
//                 </table>

//                 {/* Footer */}
//                 <div className="text-sm mt-4 text-black">
//                   <p className="text-black">
//                     <strong className="text-black">Paid by:</strong>{" "}
//                     {receiptData?.payment_method || "cash"}
//                   </p>
//                   <p className="text-black">
//                     Fees once paid are neither refundable nor transferable.
//                   </p>
//                   <p className="text-gray-500 text-xs">
//                     This is a computer generated receipt. No signature is required.
//                   </p>
//                 </div>
//               </div>

//               {/* Action Buttons */}
//               <div className="flex justify-center space-x-4 mt-6">
//                 <button
//                   onClick={handlePrint}
//                   className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg transition duration-200 flex items-center"
//                 >
//                   <i className="fa-solid fa-print mr-2"></i>
//                   Print Receipt
//                 </button>
//                 <button
//                   onClick={onClose}
//                   className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2.5 rounded-lg transition duration-200"
//                 >
//                   Close
//                 </button>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ReceiptModal;




import React, { useRef } from 'react';
import img from "../../assets/logo.png";

const ReceiptModal = ({ receiptData, onClose, isLoading }) => {
  const receiptRef = useRef();

  // 🔥 Payment mode display helper function
  const getPaymentModeDisplay = () => {
    const mode = receiptData?.payment_mode || '';
    
    if (!mode) return 'Cash';
    
    if (mode.toLowerCase() === 'qr payment' || mode.toLowerCase() === 'qr') {
      return 'QR Payment';
    }
    
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow pop-ups to print the receipt');
      return;
    }

    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          background: white;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        
        .receipt-container {
          max-width: 600px;
          width: 100%;
          padding: 20px;
          border: 1px solid #ddd;
          background: white;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        
        .header img {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        
        .header-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .header-right h2 {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          color: #000;
          text-align: center;
        }
        
        .header-right .address {
          font-size: 12px;
          font-weight: bold;
          color: #000;
          text-align: center;
          margin-top: 4px;
        }
        
        .header-right .phone {
          font-size: 12px;
          font-weight: bold;
          color: #000;
          text-align: center;
        }
        
        .receipt-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 15px;
          color: #000;
        }
        
        .receipt-info strong {
          font-weight: bold;
        }
        
        .student-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 20px;
          margin-bottom: 15px;
          padding: 8px 10px;
          background: #f9f9f9;
          font-size: 13px;
        }
        
        .student-details .label {
          font-weight: bold;
          color: #000;
        }
        
        .student-details .value {
          text-align: right;
          color: #000;
        }
        
        .fee-table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          font-size: 13px;
        }
        
        .fee-table th {
          background: #f0f0f0;
          border: 1px solid #999;
          padding: 8px 10px;
          text-align: left;
          font-weight: bold;
          color: #000;
        }
        
        .fee-table td {
          border: 1px solid #999;
          padding: 8px 10px;
          color: #000;
        }
        
        .fee-table .amount-col {
          text-align: right;
        }
        
        .grand-total {
          display: flex;
          justify-content: space-between;
          padding: 8px 10px;
          border-top: 2px solid #000;
          margin-top: 5px;
          font-size: 14px;
          font-weight: bold;
          color: #000;
          background: #f0f0f0;
        }
        
        .payment-method {
          font-size: 13px;
          margin-top: 8px;
          padding: 5px 0;
          color: #000;
        }
        
        .payment-method strong {
          font-weight: bold;
        }
        
        .footer-text {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #ddd;
          font-size: 12px;
          color: #000;
        }
        
        .footer-text p {
          margin: 2px 0;
        }
        
        .footer-text .note {
          color: #666;
          font-size: 10px;
        }
        
        .no-print {
          display: none;
        }
        
        @media print {
          body {
            padding: 0;
            background: white;
          }
          
          .receipt-container {
            border: none !important;
            padding: 15px;
            max-width: 100%;
          }
          
          .student-details {
            background: #f9f9f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .fee-table th {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .grand-total {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      </style>
    `;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData?.receipt_number || ''}</title>
        ${styles}
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header with Logo -->
          <div class="header">
            <img src="${img}" alt="logo" />
            <div class="header-right">
              <h2>New Progressive Education Public School</h2>
              <div class="address">Bhopal - 462 001</div>
              <div class="phone">Tel.: 0755 2538456</div>
            </div>
          </div>

          <!-- Receipt Info -->
          <div class="receipt-info">
            <span><strong>Receipt No.:</strong> ${receiptData?.receipt_number || ''}</span>
            <span><strong>Date:</strong> ${receiptData?.date || ''}</span>
          </div>

          <!-- Student Details -->
          <div class="student-details">
            <span class="label">Child's Name:</span>
            <span class="value">${receiptData?.child_name || ''}</span>
            <span class="label">Parent's Name:</span>
            <span class="value">${receiptData?.parent_name || ''}</span>
            <span class="label">Month:</span>
            <span class="value">${receiptData?.months || 'N/A'}</span>
            <span class="label">Grade:</span>
            <span class="value">${receiptData?.grade || ''}</span>
            <span class="label">Section:</span>
            <span class="value">${receiptData?.section || 'Not Mentioned'}</span>
          </div>

          <!-- Fee Table -->
          <table class="fee-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="amount-col">Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData?.particulars?.map(item => `
                <tr>
                  <td>${item.particular}</td>
                  <td class="amount-col">${parseFloat(item.amount).toFixed(2)}/-</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <!-- Grand Total -->
          <div class="grand-total">
            <span>Grand Total</span>
            <span>${parseFloat(receiptData?.grand_total || 0).toFixed(2)}/-</span>
          </div>

          <!-- 🔥 Payment Method - Updated to use getPaymentModeDisplay -->
          <div class="payment-method">
            <strong>Payment Mode:</strong> ${getPaymentModeDisplay()}
          </div>

          <!-- Footer -->
          <div class="footer-text">
            <p>Fees once paid are neither refundable nor transferable.</p>
            <p class="note">This is a computer generated receipt. No signature is required.</p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px;" class="no-print">
          <button onclick="window.print()" style="padding: 10px 30px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;">
            🖨️ Print Receipt
          </button>
          <button onclick="window.close()" style="padding: 10px 30px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin: 0 10px;">
            ✖ Close
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800">Payment Receipt</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
            >
              ×
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
              </div>
            </div>
          ) : (
            <>
              {/* Receipt Content - Same as ViewFeesDetails */}
              <div ref={receiptRef} className="border border-gray-300 p-6 bg-white">
                {/* Header with Logo */}
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <img src={img} alt="logo" className="w-16 h-16 object-contain" />
                    <div className="flex flex-col items-end">
                      <h2 className="text-xl font-bold uppercase leading-tight text-center text-black">
                        New Progressive Education Public School
                      </h2>
                      <div className="mt-2 text-sm text-gray-700 text-center w-full">
                        <p className="leading-tight font-bold text-black">Bhopal - 462 001</p>
                        <p className="leading-tight font-bold text-black">Tel.: 0755 2538456</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Receipt Info */}
                <div className="text-sm mb-4 space-y-2 text-black">
                  <div className="flex justify-between">
                    <p className="text-black">
                      Receipt No.:{" "}
                      <span className="font-semibold text-red-600">
                        {receiptData?.receipt_number || "--"}
                      </span>
                    </p>
                    <p className="text-black">
                      Date:{" "}
                      <span className="font-semibold text-black">
                        {receiptData?.date || "--"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-black">
                      Child's Name:{" "}
                      <span className="font-semibold capitalize text-black">
                        {receiptData?.child_name || "--"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-black">
                      Parent's Name:{" "}
                      <span className="font-semibold capitalize text-black">
                        {receiptData?.parent_name || "Not Mentioned"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-black">
                      Months:{" "}
                      <span className="font-semibold capitalize text-black">
                        {receiptData?.months || "--"}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3">
                    <p className="text-black">
                      Grade:{" "}
                      <span className="font-semibold text-black">
                        {receiptData?.grade || "Not Mentioned"}
                      </span>
                    </p>

                    <p className="text-black">
                      Section:{" "}
                      <span className="font-semibold text-black">
                        {receiptData?.section || "Not Mentioned"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Fee Table */}
                <table className="w-full text-sm border border-gray-400">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-400 p-2 text-left text-black">
                        Particulars
                      </th>
                      <th className="border border-gray-400 p-2 text-right text-black">
                        Amount (Rs.)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData?.particulars?.map((item, index) => (
                      <tr key={index}>
                        <td className="border border-gray-400 p-2 text-left text-black">
                          {item.particular}
                        </td>
                        <td className="border border-gray-400 p-2 text-right text-black">
                          {parseFloat(item.amount).toFixed(2)}/-
                        </td>
                      </tr>
                    ))}
                    {/* Grand Total Row */}
                    <tr className="bg-gray-100">
                      <td className="border border-gray-400 p-2 text-center font-semibold text-black">
                        Grand Total
                      </td>
                      <td className="border border-gray-400 p-2 text-right font-semibold text-black">
                        {parseFloat(receiptData?.grand_total || 0).toFixed(2)}/-
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 🔥 Footer - Updated to use getPaymentModeDisplay */}
                <div className="text-sm mt-4 text-black">
                  <p className="text-black">
                    <strong className="text-black">Payment Mode:</strong>{" "}
                    {getPaymentModeDisplay()}
                  </p>
                  <p className="text-black">
                    Fees once paid are neither refundable nor transferable.
                  </p>
                  <p className="text-gray-500 text-xs">
                    This is a computer generated receipt. No signature is required.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 mt-6">
                <button
                  onClick={handlePrint}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-lg transition duration-200 flex items-center"
                >
                  <i className="fa-solid fa-print mr-2"></i>
                  Print Receipt
                </button>
                <button
                  onClick={onClose}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-2.5 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;