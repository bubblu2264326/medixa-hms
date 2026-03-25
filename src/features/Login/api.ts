"use client"

import { UserData, LoginResponse } from "./types";

export async function fetchUserData(userCode: string): Promise<UserData | null> {
  try {
    const res = await fetch(`/api/login/${userCode}`);
    if (!res.ok) {
      const payload = await res.json().catch(() => ({} as any));
      const message = typeof payload?.error === "string" ? payload.error : "Lookup failed";
      if (res.status >= 500) {
        throw new Error(message);
      }
      return null;
    }
    return res.json();
  } catch (error: any) {
    throw new Error(error?.message || "Unable to verify user code right now");
  }
}

export async function loginUser(userCode: string, password: string): Promise<LoginResponse> {
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_code: userCode, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data;
  } catch (err: any) {
    throw new Error(err.message || "Network error");
  }
}

export async function logoutUser(){
  try {
     const res=await fetch("/api/logout",{
      method:"POST",
      credentials: "include",
     });
     const data=await res.json();
     if (!res.ok) throw new Error(data.message || "LogOut failed");
     return data;
  } catch (err:any) {
     throw new Error(err.message || "Network Error")
  }
}
