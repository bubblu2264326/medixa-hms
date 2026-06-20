import { Test, TestParameters } from "./types";


export async function fetchAllTests():Promise<Test[]>{
  const res=await fetch("/api/lab");
  if(!res.ok){
    throw new Error("Failed to get reponse form /api/lab");
  }
  return res.json();
}
//fetch parameters of slelcted test
export async function fetchTestParameters(test_id:number):Promise<TestParameters[]>{
  const res= await fetch("/api/lab/testParameters/"+test_id);
  if(!res.ok){
    throw new Error("Failed to fetch Parameters For Test"+test_id);
  }
  return res.json();
}
//post results of test 
export async function PostTestResults(){

}
//approval logic..if needed in future