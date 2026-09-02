import React, { useRef, useImperativeHandle, forwardRef } from "react";

export const ConfirmationModal = forwardRef(({ onConfirm, onCancel }, ref) => {
  const dialogRef = useRef();

  useImperativeHandle(ref, () => ({
    show: () => dialogRef.current.showModal(),
    close: () => dialogRef.current.close(),
  }));

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Confirm Delete</h3>
        <p className="py-4">Are you sure you want to delete?</p>
        <div className="modal-action">
          <button
            className="btn bgTheme text-white"
            onClick={() => {
              onConfirm?.();
              dialogRef.current.close();
            }}
          >
            Continue
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              onCancel?.();
              dialogRef.current.close();
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
});
