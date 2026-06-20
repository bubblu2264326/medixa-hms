
import { useEffect, useState } from "react";
import { GroupedPatientOrders, Test } from "../types";
import { fetchLabOrders } from "../api";


export function useLabOrders(){
     const [orders,setOrders]=useState<GroupedPatientOrders[]>([]);
     const [loading,setLoading]=useState<boolean>(true);
     const [error,setError]=useState<string|null>(null);
     const [startDate,setStartDate]=useState<Date>(new Date());
     const [endDate,setEndDate]=useState<Date>(new Date());
     const [expanded,setExpanded]=useState<Set<number>>(new Set())
     useEffect(()=>{
        loadLabOrders();
     },[startDate,endDate])
    async function loadLabOrders(){
        try{
            const data:Test[]=await fetchLabOrders(startDate!,endDate!);
            const groupedData:GroupedPatientOrders[]=groupByPatient(data);
            setOrders(groupedData);
        }
        catch(err){
            console.error(err);
            setError("Failed to load Lab Orders")
        }
        finally{
            setLoading(false);
        }
    }
    function groupByPatient(tests:Test[]):GroupedPatientOrders[]{
        const map =new Map<number,GroupedPatientOrders>();

        for(const t of tests){
            if(!map.has(t.patient_id)){
                map.set(t.patient_id,{
                    patient_id:t.patient_id,
                    patient_name:t.patient_name,
                    age:t.age,
                    gender:t.gender,
                    total_orders:t.total_orders_in_visit,
                    orders:[],
                });
            }
            map.get(t.patient_id)!.orders.push({
                order_id:t.order_id,
                test_id:t.test_id,
                order_date:t.order_date,
                test_name:t.test_name,
                category:t.category,
                status:t.status,
                urgency:t.urgency,
                ordered_by:t.ordered_by,
                performed_by:t.performed_by
            })
        }
        return Array.from(map.values())
    }
    function toggleExpand(patient_id:number){
        const newSet= new Set(expanded);
        if(newSet.has(patient_id)){
            newSet.delete(patient_id);
        }
        else{
            newSet.add(patient_id);
        }
        setExpanded(newSet);
    }
    return {
        orders,
        loading,
        error,
        startDate,setStartDate,
        endDate,setEndDate,
        toggleExpand,
        expanded
    }

}