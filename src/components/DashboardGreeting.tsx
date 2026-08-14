"use client";

import { useEffect, useState } from 'react';

export default function DashboardGreeting({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  const [greeting, setGreeting] = useState<string>('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) {
        setGreeting('Good Morning');
      } else if (hour < 17) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="mb-4 shrink-0">
      <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
        {greeting ? `${greeting}, ${userName}` : `Welcome back, ${userName}`}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm font-medium">
        {isAdmin
          ? "Here is what's happening with your support system today."
          : "Here is the latest update on your assigned tickets."}
      </p>
    </header>
  );
}
