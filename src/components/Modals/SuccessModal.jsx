import React, { forwardRef, useImperativeHandle, useState } from "react";

export const SuccessModal = forwardRef((props, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    navigateTo,
    buttonText = "Continue",
    message = "Your action was completed successfully.",
    title = "Success!",
  } = props;

  useImperativeHandle(ref, () => ({
    show: () => setIsOpen(true),
    close: () => setIsOpen(false),
  }));

  const handleContinue = () => {
    setIsOpen(false);
    if (navigateTo) {
      navigateTo();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 dark:bg-black/50 z-50">
      <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-xl p-6 shadow-xl w-[28rem] max-w-md text-center">
        <h1 className="font-bold text-green-700 dark:text-green-400 text-3xl mb-2">
          {title}
        </h1>
        <div className="flex justify-center mb-4">
          <i className="fa-solid fa-circle-check text-green-700 dark:text-green-400 text-5xl"></i>
        </div>
        <p className="py-3 mb-4">{message}</p>
        <div className="mt-2">
          <button
            onClick={handleContinue}
            className="btn text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800 border border-green-300 rounded-md w-50"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
});
