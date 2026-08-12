"use client";

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors mt-auto font-medium"
    >
      Logout
    </button>
  );
}
