import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { normalizeRole } from "@/src/lib/server/roles";
import { JWT_SECRET as JWT_Secret } from "@/src/lib/server/jwtSecret";

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
        const role = normalizeRole(payload.role);

        if (url.pathname.startsWith("/doctor") && role !== "doctor") {
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/lab") && role !== "lab_technician") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/receptionist") && role !== "receptionist") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/pharmacy") && role !== "pharmacist") {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (
            url.pathname.startsWith("/admin") &&
            role !== "admin" &&
            role !== "super_admin"
        ) {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (
            url.pathname.startsWith("/cashier") &&
            role !== "cashier" &&
            role !== "admin" &&
            role !== "super_admin"
        ) {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (
            url.pathname.startsWith("/ipd") &&
            !["admin", "super_admin", "doctor", "nurse", "receptionist"].includes(role)
        ) {
            url.pathname = "/";
            return NextResponse.redirect(url);
        }
        if (url.pathname.startsWith("/employee")) {
            // Any authenticated and active account can access employee self-service APIs/pages.
            return NextResponse.next();
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

export const config = { matcher: ["/doctor/:path*", "/lab/:path*", "/pharmacy/:path*", "/receptionist/:path*", "/admin/:path*", "/cashier/:path*", "/ipd/:path*", "/employee/:path*"], };
