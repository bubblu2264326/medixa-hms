import { Login } from "@/src/features/Login";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose";

import { JWT_SECRET as secret } from "@/src/lib/server/jwtSecret";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    const { payload } = await jwtVerify(token, secret);
    const role = payload.role;

    console.log("User role:", role);

    if (role === "Doctor") return redirect("/doctor");
    if (role === "Receptionist") return redirect("/receptionist");
    if (role === "Pharmacist") return redirect("/pharmacy");
    if (role === "Lab_Technician") return redirect("/lab");
    if (role === "Cashier") return redirect("/cashier");
    if (role === "Admin" || role === "Super Admin") return redirect("/admin");
  }

  return <Login />;
}
