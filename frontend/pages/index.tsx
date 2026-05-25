import React, { useState, useEffect } from "react";
import Head from "next/head";
import TeamStandupTable from "@/components/TeamStandupTable";
import RepCloseRateTable from "@/components/RepCloseRateTable";
import RevenueByRepTable from "@/components/RevenueByRepTable";
import { getLastUpdated } from "@/lib/queries";

export default function Home() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    async function fetchLastUpdated() {
      const updated = await getLastUpdated();
      setLastUpdated(updated);
    }
    fetchLastUpdated();

    // Auto-refresh every 30 minutes
    const interval = setInterval(() => {
      fetchLastUpdated();
      // Force page refresh
      window.location.reload();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <>
      <Head>
        <title>Notary Pin — Dashboard</title>
        <meta
          name="description"
          content="Rep performance coaching dashboard for Notary Pin"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Notary Pin Dashboard</h1>
            <p className="text-blue-100 mb-4">
              Real-time rep performance metrics for weekly coaching
            </p>

            {lastUpdated && (
              <div className="bg-blue-500 bg-opacity-50 rounded px-4 py-2 inline-block">
                <span className="text-sm">
                  Last updated: {getTimeAgo(lastUpdated)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* View 1: Team Daily Standup */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              View 1: Team Weekly Standup
            </h2>
            <p className="text-gray-600 mb-4">
              Rolling 8 weeks of team-level metrics. Revenue, close rates (GA &
              total), customers, AOV, and week-over-week change.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <TeamStandupTable />
            </div>
          </section>

          {/* View 2: Rep Close Rate */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              View 2: Rep Close Rate (GA vs Total)
            </h2>
            <p className="text-gray-600 mb-4">
              Individual rep performance. GA close rate (Google Ads) vs total
              close rate (all sources). 4-week rolling average and trend.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <RepCloseRateTable />
            </div>
          </section>

          {/* View 3: Revenue by Rep */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              View 3: Revenue by Rep (Month-to-Date)
            </h2>
            <p className="text-gray-600 mb-4">
              MTD revenue, daily pace target, AOV, pace %, and revenue per GA
              lead. Highlights who's ahead of / behind pace.
            </p>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <RevenueByRepTable />
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
            <p>
              Updates 2x daily (7:45am & 2:30pm Colombia time). Last pull:{" "}
              {lastUpdated
                ? lastUpdated.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "never"}
            </p>
            <p className="mt-2">
              Built with Next.js, Supabase, and Vercel. Questions?{" "}
              <a
                href="mailto:william@notarypin.com"
                className="text-blue-600 hover:underline"
              >
                Contact William
              </a>
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        main {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto",
            "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans",
            "Helvetica Neue", sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </>
  );
}
