import React, { useState, useEffect } from "react";
import { WeeklyTeam } from "@/lib/supabase";
import { getWeeklyTeamData } from "@/lib/queries";

const TeamStandupTable: React.FC = () => {
  const [data, setData] = useState<WeeklyTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await getWeeklyTeamData();
      setData(result);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const nextSunday = new Date(date);
    nextSunday.setDate(nextSunday.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };

    return `${date.toLocaleDateString("en-US", options)} – ${nextSunday.toLocaleDateString("en-US", options)}`;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600";
    if (current < previous) return "text-red-600";
    return "text-gray-600";
  };

  const getTrendSymbol = (current: number, previous: number) => {
    if (current > previous) return "↑";
    if (current < previous) return "↓";
    return "→";
  };

  if (loading) {
    return <div className="text-center py-8">Loading team data...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No team data available yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left font-semibold">Week</th>
            <th className="px-4 py-3 text-right font-semibold">Revenue</th>
            <th className="px-4 py-3 text-right font-semibold">Total CR %</th>
            <th className="px-4 py-3 text-right font-semibold">GA CR %</th>
            <th className="px-4 py-3 text-right font-semibold">New Leads</th>
            <th className="px-4 py-3 text-right font-semibold">Customers</th>
            <th className="px-4 py-3 text-right font-semibold">AOV</th>
            <th className="px-4 py-3 text-center font-semibold">WoW Δ</th>
          </tr>
        </thead>
        <tbody>
          {data.map((week, index) => {
            const prevWeek = data[index + 1];
            const revenueChange =
              prevWeek && prevWeek.revenue
                ? week.revenue - prevWeek.revenue
                : 0;

            return (
              <tr key={week.week_start} className="border-b border-gray-200">
                <td className="px-4 py-3">{formatDate(week.week_start)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(week.revenue)}
                </td>
                <td className="px-4 py-3 text-right">
                  {week.close_rate_total?.toFixed(1) || "0"}%
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {week.close_rate_ga?.toFixed(1) || "0"}%
                </td>
                <td className="px-4 py-3 text-right">
                  {week.new_leads || "—"}
                </td>
                <td className="px-4 py-3 text-right">{week.customers}</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(week.aov)}
                </td>
                <td
                  className={`px-4 py-3 text-center font-semibold ${getTrendColor(week.revenue, prevWeek?.revenue || 0)}`}
                >
                  {getTrendSymbol(week.revenue, prevWeek?.revenue || 0)}{" "}
                  {formatCurrency(revenueChange)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TeamStandupTable;
