import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
const JWT_Secret = new TextEncoder().encode(process.env.secret_key || "hms_super_secure_2026_clinic_key");

export async function middleware(req: NextRequest) {
    //get token from request
    const token = req.cookies.get("token")?.value;
    //url to change path for redirection
    const url = req.nextUrl.clone();


    if (!token) {
        url.pathname = "/";
        return NextResponse.redirect(url);
    }
    try {
        const { payload } = await jwtVerify(token, JWT_Secret);
        const role = payload.role;

        if (url.pathname.startsWith("/doctor") && role != "Doctor") {
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/lab") && role !== "Lab_Technician") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/receptionist") && role !== "Receptionist") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/pharmacy") && role !== "Pharmacist") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (
            url.pathname.startsWith("/admin") &&
            role !== "Admin" &&
            role !== "Super Admin"
        ) {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (
            url.pathname.startsWith("/cashier") &&
            role !== "Cashier" &&
            role !== "Admin" &&
            role !== "Super Admin"
        ) {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
    }
    catch (err) {
        console.error("Invalid or expired token:", err);
        url.pathname = '/';
        const response = NextResponse.redirect(url);
        response.cookies.delete("token");
        return response;
    }
    return NextResponse.next();
}

export const config = { matcher: ["/doctor/:path*", "/lab/:path*", "/pharmacy/:path*", "/receptionist/:path*", "/admin/:path*", "/cashier/:path*"], };
