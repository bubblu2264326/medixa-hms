

export interface UserData {
  name: string;
  role: string;
}

export interface LoginResponse {
  token: string;
  message?: string;
  role:string
}

export interface DecodedToken {
  role: "Doctor" | "Receptionist" | "Pharmacist" | "Lab_Technician" | "Cashier" | "Admin" | "Super Admin";
  [key: string]: any;///alows to add other keys and values 
}

export interface Quote {
  text: string;
  icon: React.ComponentType<{ className?: string }>;///we are telling that it is react component and can accept optional prop className
}
