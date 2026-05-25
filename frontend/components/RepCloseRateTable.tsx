import React, { useState, useEffect } from "react";
import { RepCloseRate } from "@/lib/supabase";
import { getRepCloseRates, getRep4WeekAvgCloseRate } from "@/lib/queries";

interface RepWithAvg extends RepCloseRate {
  avg_4week: number;
}

const RepCloseRateTable: React.FC = () => {
  const [data, setData] = useState<RepWithAvg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const reps = await getRepCloseRates();

      // Fetch 4-week average for each rep
      const withAvg = await Promise.all(
        reps.map(async (rep) => ({
          ...rep,
          avg_4week: await getRep4WeekAvgCloseRate(rep.rep_name),
        }))
      );

      setData(withAvg);
      setLoading(false);
    }
    fetchData();
  }, []);

  const getTrendArrow = (current: number, avg: number) => {
    if (current > avg + 1) return "↑"; // Up if > 1% above average
    if (current < avg - 1) return "↓"; // Down if > 1% below average
    return "→"; // Flat
  };

  const getTrendColor = (current: number, avg: number) => {
    if (current > avg + 1) return "text-green-600";
    if (current < avg - 1) return "text-red-600";
    return "text-gray-600";
  };

  if (loading) {
    return <div className="text-center py-8">Loading rep data...</div>;
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No rep data available yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="px-4 py-3 text-left font-semibold">Rep</th>
            <th className="px-4 py-3 text-right font-semibold">Total CR %</th>
            <th className="px-4 py-3 text-right font-semibold">GA CR %</th>
            <th className="px-4 py-3 text-right font-semibold">Won / Resolved</th>
            <th className="px-4 py-3 text-right font-semibold">4W Avg (GA)</th>
            <th className="px-4 py-3 text-center font-semibold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.map((rep) => (
            <tr key={rep.rep_name} className="border-b border-gray-200">
              <td className="px-4 py-3 font-semibold">{rep.rep_name}</td>
              <td className="px-4 py-3 text-right">
                {rep.close_rate_total?.toFixed(1) || "0"}%
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {rep.close_rate_ga?.toFixed(1) || "0"}%
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {rep.won_ga} / {rep.resolved_ga}
              </td>
              <td className="px-4 py-3 text-right">
                {rep.avg_4week?.toFixed(1) || "0"}%
              </td>
              <td
                className={`px-4 py-3 text-center font-bold ${getTrendColor(rep.close_rate_ga || 0, rep.avg_4week || 0)}`}
              >
                {getTrendArrow(rep.close_rate_ga || 0, rep.avg_4week || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RepCloseRateTable;
