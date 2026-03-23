import type { Metadata } from "next";
import { PatientContextProvider } from "@/contexts/PatientIdContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import AppToaster from "../components/AppToaster";
// import { Geist, Geist_Mono } from "next/font/google";
// import { Edu_NSW_ACT_Cursive } from "next/font/google";
// import { Dancing_Script } from "next/font/google";
import "./globals.css";

// const eduNswActCursive = Edu_NSW_ACT_Cursive({
//   weight: "400", // You can specify a different weight if needed
//   subsets: ["latin"],
//   variable: "--font-edu-nsw-act-cursive",
//    display: "swap", // This is crucial for performance
//   fallback: ["cursive"],
// });
// const dancingScript = Dancing_Script({
//   weight: "400",
//   subsets: ["latin"],
//   variable: "--font-dancing-script",
// });
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "Dr Fauzia Ishaq Clinic",
  description: "Advanced Hospital Management System",
  icons: {
    icon: "/logo_img.svg"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="translated-ltr">
      <body
        className={` antialiased `}
      >
        <SidebarProvider>
          <PatientContextProvider>
            {/* 
            <Toaster
              position="top-right" // top-right, top-center, bottom-left, etc.
              toastOptions={{
                // Default styles for all toasts
                style: {
                  background: "#333",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "12px 16px",
                },
                // Styles for success toasts
                success: {
                  style: {
                    background: "green",
                  },
                  iconTheme: {
                    primary: "white",
                    secondary: "green",
                  },
                },
                // Styles for error toasts
                error: {
                  style: {
                    background: "red",
                  },
                  iconTheme: {
                    primary: "white",
                    secondary: "red",
                  },
                },
              }}
            /> */}


















            <AppToaster />
            {children}
          </PatientContextProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
