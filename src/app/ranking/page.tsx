"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type RankedCompany = {
  id: string;
  commercialName: string;
  displayName: string;
  avatarUrl: string | null;
  slug: string;
  averageScore: number;
  totalRatings: number;
};

export default function RankingPage() {
  const [companies, setCompanies] = useState<RankedCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/ranking/companies?limit=100")
      .then((res) => (res.ok ? res.json() : { companies: [] }))
      .then((data: { companies?: RankedCompany[] }) => setCompanies(data.companies ?? []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white">
            Ranking de empresas
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Voltar à home
          </Link>
        </div>

        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">Carregando ranking...</p>
        ) : companies.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-center py-12">
            Nenhuma empresa com avaliações no momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {companies.map((company, index) => (
              <li key={company.id}>
                <Link
                  href={`/empresa/${company.slug}`}
                  className="flex items-center gap-4 p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
                    {index + 1}
                  </span>
                  <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {company.avatarUrl ? (
                      <img
                        src={company.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-zinc-500 dark:text-zinc-400">
                        {(company.commercialName || company.displayName || "E").charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-zinc-900 dark:text-white truncate">
                      {company.commercialName || company.displayName}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {company.totalRatings} {company.totalRatings === 1 ? "avaliação" : "avaliações"}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-lg font-bold text-amber-500 dark:text-amber-400">
                    {company.averageScore.toFixed(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
