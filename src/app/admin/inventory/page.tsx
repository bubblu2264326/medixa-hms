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
      <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">Pharmacy Inventory</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Stock monitoring & procurement auditing</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-md border-input font-semibold text-xs uppercase tracking-wide h-12">
            Procurement Log
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-md px-6 shadow-sm font-semibold text-xs uppercase tracking-wide h-12">
            New Stock Order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 rounded-lg border border-border shadow-sm bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-md">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Items</p>
              <h3 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">{data?.summary?.total_items}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg border border-border shadow-sm bg-card">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-success/10 text-success rounded-md">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inventory Value</p>
              <h3 className="text-2xl font-semibold text-foreground tracking-tight font-mono tabular-nums">PKR {Number(data?.summary?.total_value).toLocaleString()}</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg shadow-sm bg-destructive/10 border border-destructive/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-destructive text-white rounded-md">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Low Stock</p>
              <h3 className="text-2xl font-semibold text-destructive tracking-tight font-mono tabular-nums">{data?.summary?.low_stock_count} Items</h3>
            </div>
          </div>
        </Card>

        <Card className="p-6 rounded-lg shadow-sm bg-warning/15 border border-warning/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-warning text-warning-foreground rounded-md">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning-foreground">Soon Expiring</p>
              <h3 className="text-2xl font-semibold text-warning-foreground tracking-tight font-mono tabular-nums">{data?.summary?.soon_expiring_count} Batches</h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-8 rounded-lg border border-border shadow-sm bg-card overflow-hidden">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-semibold text-foreground tracking-tight">Inventory Alerts</h3>
                   <p className="text-xs font-medium text-muted-foreground mt-1">Immediate action required for these items</p>
                </div>
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground group">
                   <span className="text-xs font-semibold uppercase tracking-wide">View All</span>
                   <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
             </div>

             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-border">
                         <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Item Name</th>
                         <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Current Stock</th>
                         <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Threshold</th>
                         <th className="pb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground px-4">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {data?.lowStock?.map((item: any, i: number) => (
                        <tr key={i} className="group hover:bg-accent transition-colors">
                           <td className="py-5 px-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-md bg-destructive/10 flex items-center justify-center text-destructive">
                                    <Archive className="w-4 h-4" />
                                 </div>
                                 <div>
                                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                    <p className="text-[10px] font-medium text-muted-foreground">{item.generic_name}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="py-5 px-4">
                              <span className="text-sm font-semibold text-destructive font-mono tabular-nums">{item.current_stock}</span>
                              <span className="text-[10px] font-medium text-muted-foreground ml-1">{item.unit}</span>
                           </td>
                           <td className="py-5 px-4 text-sm font-semibold text-muted-foreground font-mono tabular-nums">{item.low_stock_threshold}</td>
                           <td className="py-5 px-4">
                              <span className="bg-destructive/10 text-destructive text-[9px] font-semibold px-2 py-1 rounded-md uppercase tracking-wide">Critical Low</span>
                           </td>
                        </tr>
                      ))}
                      {data?.lowStock?.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-12 text-center text-muted-foreground font-medium text-sm">
                              No low stock alerts currently
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </Card>

          {/* Soon Expiring */}
          <Card className="p-8 rounded-lg border border-border shadow-sm bg-card">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h3 className="text-xl font-semibold text-foreground tracking-tight">Expiry Watchlist</h3>
                   <p className="text-xs font-medium text-muted-foreground mt-1">Batches expiring within 90 days</p>
                </div>
                <div className="p-2 bg-warning/15 text-warning-foreground rounded-md">
                   <ShieldAlert className="w-5 h-5" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.expiringSoon?.map((item: any, i: number) => {
                   const expiry = new Date(item.expiry_date);
                   const daysLeft = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                   return (
                     <div key={i} className="p-4 rounded-md border border-border bg-muted flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className="w-2 h-8 rounded-full bg-warning" />
                           <div>
                              <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">{item.name}</p>
                              <p className="text-[10px] font-medium text-muted-foreground font-mono tabular-nums">Batch: {item.batch_number}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-semibold text-warning-foreground font-mono tabular-nums">{daysLeft} Days Left</p>
                           <p className="text-[10px] font-medium text-muted-foreground font-mono tabular-nums">{formatDateInTimezone(expiry, systemTimezone)}</p>
                        </div>
                     </div>
                   );
                })}
             </div>
          </Card>
        </div>

        {/* Categories */}
        <div className="space-y-8">
           <Card className="p-8 rounded-lg border border-border shadow-sm bg-card h-full">
              <h3 className="text-xl font-semibold text-foreground tracking-tight mb-8">Category Value</h3>
              <div className="space-y-6">
                 {data?.categories?.map((cat: any, i: number) => {
                    const totalValue = data.categories.reduce((acc: number, curr: any) => acc + Number(curr.value), 0);
                    const percent = (Number(cat.value) / totalValue) * 100;
                    const colors = ['bg-primary', 'bg-success', 'bg-info', 'bg-muted-foreground'];

                    return (
                       <div key={i} className="group">
                          <div className="flex justify-between items-end mb-2">
                             <div>
                                <h4 className="text-sm font-semibold text-foreground tracking-tight">{cat.category}</h4>
                                <p className="text-[10px] font-medium text-muted-foreground"><span className="font-mono tabular-nums">{cat.item_count}</span> Unique Items</p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs font-semibold text-foreground font-mono tabular-nums">PKR {Number(cat.value).toLocaleString()}</p>
                             </div>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                             <div
                                className={`h-full rounded-full transition-all duration-1000 ${colors[i % colors.length]}`}
                                style={{ width: `${percent}%` }}
                             />
                          </div>
                       </div>
                    );
                 })}
              </div>

              <div className="mt-12 pt-8 border-t border-border">
                 <div className="flex items-center gap-4 p-5 bg-primary/10 rounded-md">
                    <Layers className="w-8 h-8 text-primary" />
                    <div>
                       <h5 className="text-xs font-semibold text-foreground uppercase tracking-wide">Stock Health</h5>
                       <p className="text-[10px] font-medium text-muted-foreground mt-0.5">92% of inventory is within safe levels. 8% requires restocking replenishment.</p>
                    </div>
                 </div>
              </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
