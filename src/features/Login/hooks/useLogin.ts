
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserData, loginUser } from "../api";
import { UserData, DecodedToken } from "../types";


export function useLogin() {
  const [userCode, setUserCode] = useState("");
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [lookupError, setLookupError] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const router = useRouter();


  const redirectByRole = (role: string) => {
    switch (role) {
      case "Doctor":
        router.replace("/doctor");
        break;
      case "Receptionist":
        router.replace("/receptionist");
        break;
      case "Pharmacist":
        router.replace("/pharmacy");
        break;
      case "Lab_Technician":
        router.replace("/lab");
        break;
      case "Cashier":
        router.replace("/cashier");
        break;
      case "Admin":
      case "Super Admin":
        router.replace("/admin");
        break;
      default:
        router.replace("/");
    }
  };

  useEffect(() => {
    setAuthError("");
  }, [password]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedUserCode = userCode.trim();
      const userCodeRegex = /^[A-Z]{3}\d{3}$/;

      setAuthError("");

      if (!trimmedUserCode) {
        setLookupError("");
        setName("");
        setDesignation("");
        return;
      }

      if (!userCodeRegex.test(trimmedUserCode)) {
        setLookupError("");
        setName("");
        setDesignation("");
        return;
      }

      getUserData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [userCode]);

  const getUserData = async () => {
    setIsFetchingInfo(true);
    setLookupError("");

    try {
      const data = await fetchUserData(userCode);
      if (!data) setLookupError("User code not found");
      else {
        setName(data.name);
        setDesignation(data.role);
      }
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const verifyUserLogin = async () => {
    setIsLoading(true);
    setAuthError("");

    try {
      const data = await loginUser(userCode, password);
      console.log(data);

      if (data?.role) redirectByRole(data.role);
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };


  return {
    userCode,
    name,
    designation,
    password,
    showPassword,
    isLoading,
    isFetchingInfo,
    lookupError,
    authError,
    setUserCode,
    setName,
    setDesignation,
    setPassword,
    setShowPassword,
    getUserData,
    verifyUserLogin,
  };
}
