"use client";

import { useEffect, useState } from "react";

interface Poll {
  title: string;
  options: string[];
}

export default function PollList() {
  const [polls, setPolls] = useState<Poll[]>([]);

  useEffect(() => {
    const storedPolls = JSON.parse(localStorage.getItem("polls") || "[]");
    setPolls(storedPolls);
  }, []);

  if (polls.length === 0) {
    return (
      <div className="text-center text-zinc-500 mt-8">
        Nenhuma enquete criada ainda.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
      <h2 className="text-2xl font-bold text-center text-zinc-900 dark:text-white">
        Enquetes Criadas
      </h2>

      {polls.map((poll, index) => (
        <div
          key={index}
          className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-md"
        >
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            {poll.title}
          </h3>
          <ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-300">
            {poll.options.map((option, idx) => (
              <li key={idx}>{option}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
