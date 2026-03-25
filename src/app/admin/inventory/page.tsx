"use client";
import React, { useState, useEffect } from "react";
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  BarChart3,
  ArrowRight,
  ShieldAlert,
  Layers,
  Archive
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

export default function InventoryPage() {
  const systemTimezone = useSystemTimezone();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/inventory")
      .then(res => res.json())
      .then(d => {
        if (d.error) {
          console.error(d.error);
          setData(null);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Pharmacy Inventory</h1>
          <p className="text-slate-500 text-sm font-semibold mt-1">Stock monitoring & procurement auditing</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl border-slate-200 font-bold text-xs uppercase tracking-wider h-12">
            Procurement Log
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-6 shadow-xl font-bold text-xs uppercase tracking-wider h-12">
            New Stock Order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{data?.summary?.total_items}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory Value</p>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">PKR {Number(data?.summary?.total_value).toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-rose-100 bg-rose-50 border border-rose-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Low Stock</p>
              <h3 className="text-2xl font-black text-rose-600 tracking-tight">{data?.summary?.low_stock_count} Items</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-[2rem] border-none shadow-xl shadow-amber-100 bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Soon Expiring</p>
              <h3 className="text-2xl font-black text-amber-600 tracking-tight">{data?.summary?.soon_expiring_count} Batches</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Inventory Alerts</h3>
                   <p className="text-xs font-bold text-slate-400 mt-1">Immediate action required for these items</p>
                </div>
                <Button variant="ghost" className="text-slate-400 hover:text-slate-900 group">
                   <span className="text-[10px] font-black uppercase tracking-widest">View All</span>
                   <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-slate-50 italic">
                         <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Item Name</th>
                         <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Current Stock</th>
                         <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Threshold</th>
                         <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 px-4">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {data?.lowStock?.map((item: any, i: number) => (
                        <tr key={i} className="group hover:bg-slate-50 transition-colors">
                           <td className="py-5 px-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                                    <Archive className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-slate-800">{item.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.generic_name}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="py-5 px-4">
                              <span className="text-sm font-black text-rose-600">{item.current_stock}</span>
                              <span className="text-[10px] font-bold text-slate-400 ml-1">{item.unit}</span>
                           </td>
                           <td className="py-5 px-4 text-sm font-black text-slate-500">{item.low_stock_threshold}</td>
                           <td className="py-5 px-4">
                              <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter">Critical Low</span>
                           </td>
                        </tr>
                      ))}
                      {data?.lowStock?.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-12 text-center text-slate-400 font-bold text-sm">
                              No low stock alerts currently
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </Card>

          {/* Soon Expiring */}
          <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Expiry Watchlist</h3>
                   <p className="text-xs font-bold text-slate-400 mt-1">Batches expiring within 90 days</p>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                   <ShieldAlert className="w-5 h-5" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.expiringSoon?.map((item: any, i: number) => {
                   const expiry = new Date(item.expiry_date);
                   const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                   
                   return (
                     <div key={i} className="p-4 rounded-[1.5rem] border border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-8 rounded-full bg-amber-400" />
                           <div>
                              <p className="text-sm font-black text-slate-800 truncate max-w-[120px]">{item.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Batch: {item.batch_number}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-amber-600">{daysLeft} Days Left</p>
                           <p className="text-[10px] font-bold text-slate-400">{formatDateInTimezone(expiry, systemTimezone)}</p>
                        </div>
                     </div>
                   );
                })}
             </div>
          </Card>
        </div>

        {/* Categories */}
        <div className="space-y-8">
           <Card className="p-8 rounded-[2.5rem] border-none shadow-2xl shadow-slate-200/50 bg-white h-full">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8">Category Value</h3>
              <div className="space-y-6">
                 {data?.categories?.map((cat: any, i: number) => {
                    const totalValue = data.categories.reduce((acc: number, curr: any) => acc + Number(curr.value), 0);
                    const percent = (Number(cat.value) / totalValue) * 100;
                    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-slate-500'];

                    return (
                       <div key={i} className="group">
                          <div className="flex justify-between items-end mb-2">
                             <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{cat.category}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{cat.item_count} Unique Items</p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-black text-slate-800">PKR {Number(cat.value).toLocaleString()}</p>
                             </div>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full transition-all duration-1000 ${colors[i % colors.length]}`} 
                                style={{ width: `${percent}%` }}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>

              <div className="mt-12 pt-8 border-t border-slate-50">
                 <div className="flex items-center gap-4 p-5 bg-indigo-50/50 rounded-3xl">
                    <Layers className="w-8 h-8 text-indigo-500" />
                    <div>
                       <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Stock Health</h5>
                       <p className="text-[10px] font-bold text-slate-500 mt-0.5">92% of inventory is within safe levels. 8% requires restocking replenishment.</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
