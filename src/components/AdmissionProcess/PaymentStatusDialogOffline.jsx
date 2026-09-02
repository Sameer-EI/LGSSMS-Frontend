// import React from 'react';
// import img from "../../assets/logo.png";

// const PaymentStatusDialogOffline = ({ paymentStatus, onClose }) => {
//   const isSuccess = paymentStatus?.status === 'success' || paymentStatus?.success === true;
//   const isFailed = paymentStatus?.status === 'failed' || paymentStatus?.success === false;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
//         <div className="p-6">
//           {/* Header with Logo - Same as ViewFeesDetails */}
//           <div className="mb-6">
//             <div className="flex items-center justify-between">
//               <img src={img} alt="logo" className="w-16 h-16 object-contain" />
//               <div className="flex flex-col items-end">
//                 <h2 className="text-xl font-bold uppercase leading-tight text-center text-black">
//                   New Progressive Education Public School
//                 </h2>
//                 <div className="mt-2 text-sm text-gray-700 text-center w-full">
//                   <p className="leading-tight font-bold text-black">Bhopal - 462 001</p>
//                   <p className="leading-tight font-bold text-black">Tel.: 0755 2538456</p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Payment Status */}
//           <div className="text-center py-6">
//             {isSuccess ? (
//               <>
//                 <div className="text-green-500 text-5xl mb-3">
//                   <i className="fa-solid fa-circle-check"></i>
//                 </div>
//                 <h3 className="text-2xl font-bold text-green-600">Payment Successful!</h3>
//                 <p className="text-gray-600 mt-2">
//                   Payment received via <span className="font-semibold">{paymentStatus?.payment_method || 'cash'}</span>.
//                 </p>
//                 {paymentStatus?.receipt_number && (
//                   <p className="text-sm text-gray-500 mt-3 font-mono">
//                     Receipt No.: {paymentStatus.receipt_number}
//                   </p>
//                 )}
//                 {paymentStatus?.cheque_number && (
//                   <p className="text-sm text-gray-500">
//                     Cheque No.: {paymentStatus.cheque_number}
//                   </p>
//                 )}
//                 {paymentStatus?.amount && (
//                   <p className="text-sm text-gray-500">
//                     Amount: ₹{parseFloat(paymentStatus.amount).toFixed(2)}
//                   </p>
//                 )}
//               </>
//             ) : isFailed ? (
//               <>
//                 <div className="text-red-500 text-5xl mb-3">
//                   <i className="fa-solid fa-circle-xmark"></i>
//                 </div>
//                 <h3 className="text-2xl font-bold text-red-600">Payment Failed!</h3>
//                 <p className="text-gray-600 mt-2">
//                   {paymentStatus?.message || 'Something went wrong. Please try again.'}
//                 </p>
//               </>
//             ) : (
//               <>
//                 <div className="text-yellow-500 text-5xl mb-3">
//                   <i className="fa-solid fa-circle-exclamation"></i>
//                 </div>
//                 <h3 className="text-2xl font-bold text-yellow-600">Processing...</h3>
//                 <p className="text-gray-600 mt-2">
//                   Your payment is being processed.
//                 </p>
//               </>
//             )}
//           </div>

//           {/* Footer Note - Same as ViewFeesDetails */}
//           <div className="text-sm mt-4 text-black border-t pt-4">
//             <p className="text-black">
//               <strong className="text-black">Paid by:</strong> {paymentStatus?.payment_method || 'cash'}
//             </p>
//             <p className="text-black">
//               Fees once paid are neither refundable nor transferable.
//             </p>
//             <p className="text-gray-500 text-xs">
//               This is a computer generated receipt. No signature is required.
//             </p>
//           </div>

//           {/* Close Button */}
//           <div className="flex justify-center mt-6">
//             <button
//               onClick={onClose}
//               className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg transition duration-200"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default PaymentStatusDialogOffline;



import React from 'react';
import img from "../../assets/logo.png";

const PaymentStatusDialogOffline = ({ paymentStatus, onClose }) => {
  const isSuccess = paymentStatus?.success === true;
  const isFailed = paymentStatus?.success === false;

  // 🔥 Payment mode display - ab direct payment_status se lo
  const getPaymentModeDisplay = () => {
    const mode = paymentStatus?.payment_mode || '';
    
    if (!mode) return 'Cash';
    
    // QR Payment ke liye special formatting
    if (mode.toLowerCase() === 'qr payment' || mode.toLowerCase() === 'qr') {
      return 'QR Payment';
    }
    
    // Baaki modes ko capitalize karo
    return mode.charAt(0).toUpperCase() + mode.slice(1);
  };

  // 🔥 Receipt number
  const getReceiptNumber = () => {
    return paymentStatus?.receipt_number || '';
  };

  // 🔥 Amount - pehle total_amount_paid, nahi toh grand_total, nahi toh amount
  const getAmount = () => {
    return paymentStatus?.total_amount_paid || paymentStatus?.grand_total || paymentStatus?.amount || '0';
  };

  return (
    <div className="fixed inset-0 bg-transparent bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
        <div className="p-6">
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

          {/* Payment Status */}
          <div className="text-center py-6">
            {isSuccess ? (
              <>
                <div className="text-green-500 text-5xl mb-3">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h3 className="text-2xl font-bold text-green-600">Payment Successful!</h3>
                <p className="text-gray-600 mt-2">
                  Payment received via <span className="font-semibold">{getPaymentModeDisplay()}</span>.
                </p>
                {getReceiptNumber() && (
                  <p className="text-sm text-gray-500 mt-3 font-mono">
                    Receipt No.: {getReceiptNumber()}
                  </p>
                )}
                {paymentStatus?.cheque_number && (
                  <p className="text-sm text-gray-500">
                    Cheque No.: {paymentStatus.cheque_number}
                  </p>
                )}
                {getAmount() && (
                  <p className="text-sm text-gray-500">
                    Amount: ₹{parseFloat(getAmount()).toFixed(2)}
                  </p>
                )}
              </>
            ) : isFailed ? (
              <>
                <div className="text-red-500 text-5xl mb-3">
                  <i className="fa-solid fa-circle-xmark"></i>
                </div>
                <h3 className="text-2xl font-bold text-red-600">Payment Failed!</h3>
                <p className="text-gray-600 mt-2">
                  {paymentStatus?.message || 'Something went wrong. Please try again.'}
                </p>
              </>
            ) : (
              <>
                <div className="text-yellow-500 text-5xl mb-3">
                  <i className="fa-solid fa-circle-exclamation"></i>
                </div>
                <h3 className="text-2xl font-bold text-yellow-600">Processing...</h3>
                <p className="text-gray-600 mt-2">
                  Your payment is being processed.
                </p>
              </>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-sm mt-4 text-black border-t pt-4">
            <p className="text-black">
              <strong className="text-black">Payment Mode:</strong> {getPaymentModeDisplay()}
            </p>
            <p className="text-black">
              Fees once paid are neither refundable nor transferable.
            </p>
            <p className="text-gray-500 text-xs">
              This is a computer generated receipt. No signature is required.
            </p>
          </div>

          {/* Close Button */}
          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusDialogOffline;