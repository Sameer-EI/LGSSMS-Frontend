import React from "react";

const AdmissionEditedSuccessfully = ({ 
    handleCloseOnly, 
    handleCloseAndNavigate,
    isOpen = true 
}) => {
    if (!isOpen) return null;

    return (
        <div className="modal modal-open bg-black/30 backdrop-blur-sm">
            <div className="modal-box text-center max-w-md">
                {/* Success Icon */}
                <div className="flex justify-center mb-4">
                    <i className="fa-regular fa-circle-check text-green-500 text-5xl"></i>
                </div>
                
                {/* Title */}
                <h3 className="font-bold text-2xl mb-3 text-gray-800 dark:text-amber-50">
                    Admission Details Updated Successfully!
                </h3>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-3 justify-center px-4 md:flex-row md:items-center">
                    <button
                        className="btn border border-gray-400 text-gray-600 bg-transparent hover:bg-gray-100 min-w-[200px] text-sm"
                        onClick={handleCloseOnly}
                    >
                        OK
                    </button>
                    <button
                        className="btn text-gray-600 bg-gray-100 hover:opacity-90 min-w-[200px] text-sm"
                        onClick={handleCloseAndNavigate}
                    >
                        View Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdmissionEditedSuccessfully;