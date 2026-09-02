import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginModal from "./LoginModal";

const LoginSuccessHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (location.state?.showSuccess) {
      setShowModal(true);
    }
  }, [location]);

  const handleClose = () => {
    setShowModal(false);
    navigate(location.pathname, { replace: true });
  };

  return showModal ? <LoginModal onClose={handleClose} /> : null;
};

export default LoginSuccessHandler;
