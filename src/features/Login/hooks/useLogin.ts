
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchUserData, loginUser } from "../api";

const RECENT_LOGIN_CODES_KEY = "hms_recent_login_codes";
const MAX_RECENT_CODES = 6;

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
      if (!data) {
        setLookupError("User code not found");
      } else {
        setName(data.name);
        setDesignation(data.role);
      }
    } catch (err: any) {
      setLookupError(err?.message || "Unable to verify user code right now");
      setName("");
      setDesignation("");
    } finally {
      setIsFetchingInfo(false);
    }
  };

  const verifyUserLogin = async () => {
    setIsLoading(true);
    setAuthError("");

    try {
      const data = await loginUser(userCode, password);
      const normalizedCode = userCode.trim().toUpperCase();
      if (normalizedCode && typeof window !== "undefined") {
        try {
          const existingRaw = window.localStorage.getItem(RECENT_LOGIN_CODES_KEY);
          const existing = existingRaw ? (JSON.parse(existingRaw) as string[]) : [];
          const next = [normalizedCode, ...existing.filter((c) => c !== normalizedCode)].slice(
            0,
            MAX_RECENT_CODES
          );
          window.localStorage.setItem(RECENT_LOGIN_CODES_KEY, JSON.stringify(next));
        } catch {
          // Best-effort only: login should never fail because localStorage is unavailable.
        }
      }

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
