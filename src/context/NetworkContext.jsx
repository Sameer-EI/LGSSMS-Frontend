import { createContext, useEffect, useMemo, useState } from "react";
import { constants } from "../global/constants";
import axios from "axios";

export const NetWorkContext = createContext(null); 

export const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(constants.isOnline);
  const NetworkCheck = async () => {
    try {
      const response = await axios.get(
        "https://jsonplaceholder.typicode.com/posts"
      );
      setIsOnline(response.status == 200);
    } catch (error) {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(NetworkCheck, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const NetworkContextValue = useMemo(
    () => ({
      isOnline,
    }),
    [isOnline]
  );

  return (
    <NetWorkContext.Provider value={NetworkContextValue}>
      {children}
    </NetWorkContext.Provider>
  );
};
