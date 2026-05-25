import React, { useState, useEffect } from "react";
import { RepRevenue } from "@/lib/supabase";
import { getRepRevenue, getConfig } from "@/lib/queries";

interface RepRevenueWithPace extends RepRevenue {
  daily_pace_target: number;
}

const RevenueByRepTable: React.FC = () => {
  const [data, setData] = useState<RepRevenueWithPace[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyGoal, setMonthlyGoal] = useState(250000);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Get monthly goal from config
      const goal = await getConfig("monthly_goal");
      if (goal) {
        setMonthlyGoal(Number(goal));
      }

      // Get rep revenue data
      const revenue = await getRepRevenue();

      // Calculate daily pace target
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysElapsed = today.getDate();
      const dailyPaceTarget = (monthlyGoal / daysInMonth) * daysElapsed;

      // Add pace target to each rep
      const withPace = revenue.map((rep) => ({
        ...rep,
        daily_pace_target: dailyPaceTarget,
      }));

      setData(withPace);
      setLoading(false);
    }
    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPaceColor = (pct: number) => {
    if (pct >= 100) return "text-green-600 font-bold";
    if (pct >= 90) return "text-green-600";
    if (pct >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return <div className="text-center py-8">Loading revenue data...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No revenue data available yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left font-semibold">Rep</th>
            <th className="px-4 py-3 text-right font-semibold">MTD Revenue</th>
            <th className="px-4 py-3 text-right font-semibold">Daily Pace Target</th>
            <th className="px-4 py-3 text-right font-semibold">AOV</th>
            <th className="px-4 py-3 text-right font-semibold">Pace %</th>
            <th className="px-4 py-3 text-right font-semibold">$/GA Lead</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rep) => (
            <tr key={rep.rep_name} className="border-b border-gray-200">
              <td className="px-4 py-3 font-semibold">{rep.rep_name}</td>
              <td className="px-4 py-3 text-right font-semibold">
                {formatCurrency(rep.mtd_revenue)}
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {formatCurrency(rep.daily_pace_target)}
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(rep.mtd_aov)}
              </td>
              <td className={`px-4 py-3 text-right font-semibold ${getPaceColor(rep.mtd_pace_pct || 0)}`}>
                {rep.mtd_pace_pct?.toFixed(0) || "0"}%
              </td>
              <td className="px-4 py-3 text-right">
                {formatCurrency(rep.revenue_per_ga_lead || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RevenueByRepTable;
