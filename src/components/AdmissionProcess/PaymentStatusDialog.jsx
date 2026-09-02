import React, { useContext } from 'react';
import img from "../../assets/logo.png";

const PaymentStatusDialog = ({ paymentStatus, onClose }) => {
  const isSuccess = paymentStatus?.status === 'success' || paymentStatus?.success === true;
  const isFailed = paymentStatus?.status === 'failed' || paymentStatus?.success === false;
  const isProcessing = !isSuccess && !isFailed;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
        <div className="p-6">
          {/* Header with Logo - Same as ViewFeesDetails */}
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
                  Your online payment has been processed successfully.
                </p>
                {paymentStatus?.receipt_number && (
                  <p className="text-sm text-gray-500 mt-3 font-mono">
                    Receipt No.: {paymentStatus.receipt_number}
                  </p>
                )}
                {paymentStatus?.transaction_id && (
                  <p className="text-sm text-gray-500">
                    Txn ID: {paymentStatus.transaction_id}
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
                  Your payment is being processed. Please wait...
                </p>
                <div className="flex justify-center mt-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Note - Same as ViewFeesDetails */}
          <div className="text-sm mt-4 text-black border-t pt-4">
            <p className="text-black">
              <strong className="text-black">Paid by:</strong> Online
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

export default PaymentStatusDialog;