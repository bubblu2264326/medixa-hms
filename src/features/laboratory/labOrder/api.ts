import { Test } from "./types";

export async function fetchLabOrders(startDate:Date,endDate:Date):Promise<Test[]>{
   const params=new URLSearchParams({
      startDate:startDate.toISOString(),
      endDate:endDate.toISOString(),
   });
   const res= await fetch(`/api/lab/order?${params.toString()}`);
   if(!res.ok) throw new Error("Failed to Fetch All Lab orders ");
   return await res.json();
}

export async function fetchLabOrdersForPatient(patientId:string):Promise<Test>{
   const res= await fetch("/api/lab/order");
   if(!res.ok) throw new Error("Failed to Fetch  Lab orders for a patient  ");
   return await res.json();
}


