import Lottie from "lottie-react";
import schoolboyAnimation from "../../assets/backtoschool.json";

const LoginModal = ({ onClose }) => {
 return (
  <div
    className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm dark:bg-black/60"
    onClick={onClose}
  >
    <div
      className="bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 max-w-3xl w-full mx-4 flex flex-col items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Animation + Heading */}
      <div className="mt-10 md:mt-16 w-full max-w-md flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
        <Lottie
          animationData={schoolboyAnimation}
          loop={true}
          className="w-[120px] sm:w-[150px] md:w-[180px] lg:w-[200px] animate-bounce"
        />
        <h1 className="textTheme text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium animate-pulse text-center md:text-left dark:text-white">
          Welcome!
        </h1>
      </div>

      {/* Subtext + Button */}
      <div className="mt-6 md:mt-10 text-center max-w-2xl px-2">
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base md:text-lg">
          Our doors are always open to curious minds and passionate learners.
        </p>
        <button
          className="mt-6 px-6 py-2 btn bgTheme btn-primary w-full sm:w-auto dark:bg-blue-600 dark:hover:bg-blue-700"
          onClick={onClose}
        >
          Let's Begin
        </button>
      </div>
    </div>
  </div>
);

};

export default LoginModal;
