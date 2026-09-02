import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <>
      <footer className="footer sm:footer-horizontal footer-center bg-base-100 text-base-content p-4 shadow-sm fixed bottom-0 left-0 w-fullz--10 z-5">
        <aside className="flex flex-col sm:flex-row sm:justify-between w-full items-center max-w-7xl mx-auto px-4">
          <p className="textTheme font-semibold">Copyright © {new Date().getFullYear()} - All right reserved by ACME Industries Ltd</p>
          <Link 
            to="/privacyPolicy" 
            className="textTheme hover:underline mt-2 sm:mt-0 font-semibold"
          >
            Privacy Policy
          </Link>
        </aside>
      </footer>
    </>
  );
};

export default Footer;


