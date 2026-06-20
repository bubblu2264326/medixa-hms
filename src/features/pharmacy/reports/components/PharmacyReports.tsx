"use client";

import { useEffect, useState } from "react";
import { 
  AlertTriangle, 
  PackageX, 
  Calendar, 
  Download, 
  Search,
  ChevronRight,
  RefreshCcw,
  Package
} from "lucide-react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { MedicineBatchSummary } from "./MedicineBatchSummary";
import { formatDateInTimezone } from "@/src/lib/timezone/client";
import { useSystemTimezone } from "@/src/lib/timezone/useSystemTimezone";

interface ExpiringItem {
  brand_name: string;
  generic_name: string;
  batch_number: string;
  expiry_date: string;
  stock_quantity: number;
  stock_sub_quantity: number;
}

interface DeadStockItem {
  medicine_id: number;
  brand_name: string;
  generic_name: string;
  total_units: number;
  total_sub_units: number;
  last_sale_date: string | null;
}

export function PharmacyReports() {
  const systemTimezone = useSystemTimezone();
  const [data, setData] = useState<{
    expiringSoon: ExpiringItem[];
    deadStock: DeadStockItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expiring" | "dead" | "medicine">("expiring");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/reports/stock");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const exportToCSV = () => {
    if (!data) return;
    if (activeTab === "medicine") return;
    const currentData = activeTab === "expiring" ? data.expiringSoon : data.deadStock;
    if (currentData.length === 0) return;

    const headers = Object.keys(currentData[0]).join(",");
    const rows = currentData.map(item => Object.values(item).join(","));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pharmacy_${activeTab}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = () => {
    if (!data) return [];
    const source = activeTab === "expiring" ? data.expiringSoon : data.deadStock;
    return source.filter(item => 
      item.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.generic_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <RefreshCcw className="animate-spin text-primary" size={32} />
        <p className="text-muted-foreground font-medium">Generating inventory analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 bg-muted/80 p-1 rounded-md border border-border/40 w-fit">
          <button
            onClick={() => setActiveTab("expiring")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "expiring" 
                ? "bg-white text-primary shadow-sm border border-border/60" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <AlertTriangle size={16} />
            Expiring Soon
            {data?.expiringSoon.length ? (
              <span className="ml-1 px-1.5 py-0.5 bg-destructive/10 text-destructive rounded-full text-[10px]">
                {data.expiringSoon.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("dead")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "dead" 
                ? "bg-white text-primary shadow-sm border border-border/60" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackageX size={16} />
            Dead Stock
            {data?.deadStock.length ? (
              <span className="ml-1 px-1.5 py-0.5 bg-warning/15 text-warning-foreground rounded-full text-[10px]">
                {data.deadStock.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("medicine")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === "medicine"
                ? "bg-white text-primary shadow-sm border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package size={16} />
            Medicine Stock
          </button>
        </div>

        {activeTab !== "medicine" ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 w-64"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={exportToCSV}
              className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Download size={16} />
              Export CSV
            </Button>
            <Button 
              variant="ghost" 
              onClick={fetchData}
              className="p-2 text-muted-foreground hover:bg-muted rounded-xl"
            >
              <RefreshCcw size={18} />
            </Button>
          </div>
        ) : null}
      </div>

      {activeTab === "medicine" ? (
        <MedicineBatchSummary />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredData().length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Package size={48} className="text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No records found</h3>
              <p className="text-muted-foreground max-w-xs mt-2">
                Your inventory looks healthy! Try adjusting your search or check back later.
              </p>
            </Card>
          ) : (
            <div className="bg-white rounded-[1.5rem] border border-border shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Medicine Details</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {activeTab === "expiring" ? "Batch & Expiry" : "Last Activity"}
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Current Stock</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeTab === "expiring" ? (
                    (filteredData() as ExpiringItem[]).map((item, idx) => {
                      const expiryDate = new Date(item.expiry_date);
                      const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                      const isCritical = daysLeft < 30;

                      return (
                        <tr key={idx} className="hover:bg-muted/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="font-bold text-foreground">{item.brand_name}</div>
                            <div className="text-xs text-muted-foreground font-medium italic">{item.generic_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-mono text-muted-foreground">
                                #{item.batch_number}
                              </span>
                            </div>
                            <div className={`text-xs mt-1.5 font-bold flex items-center gap-1.5 ${isCritical ? "text-destructive" : "text-warning-foreground"}`}>
                              <Calendar size={12} />
                              Exp: {formatDateInTimezone(expiryDate, systemTimezone)}
                              <span className="text-[10px] uppercase">({daysLeft} days left)</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-bold text-foreground">{item.stock_quantity} Units</div>
                            <div className="text-[10px] text-muted-foreground font-bold uppercase">{item.stock_sub_quantity} Sub-units</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                              <ChevronRight size={16} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    (filteredData() as DeadStockItem[]).map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{item.brand_name}</div>
                          <div className="text-xs text-muted-foreground font-medium italic">{item.generic_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          {item.last_sale_date ? (
                            <div className="text-xs text-muted-foreground font-medium">
                              Last sold: {formatDateInTimezone(item.last_sale_date, systemTimezone)}
                            </div>
                          ) : (
                            <div className="text-xs text-destructive font-bold uppercase tracking-tight">Never Sold</div>
                          )}
                          <div className="text-[10px] text-muted-foreground mt-1 italic">Idle for 6+ months</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-foreground">{item.total_units} Units</div>
                          <div className="text-[10px] text-muted-foreground font-bold uppercase">{item.total_sub_units} Sub-units</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                            <ChevronRight size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
