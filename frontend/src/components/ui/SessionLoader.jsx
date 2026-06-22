import { useEffect, useState } from "react";

const phrases = [
  "Taking you in",
  "One moment",
  "Restoring your session",
  "Almost there",
  "Getting things ready",
  "Welcome back",
];

/**
 * Full-screen branded loader shown while a persistent session is being
 * restored, so returning users see a friendly message instead of a flash of
 * the login page.
 */
export function SessionLoader() {
  const [phrase, setPhrase] = useState(() => phrases[Math.floor(Math.random() * phrases.length)]);

  useEffect(() => {
    const id = setInterval(() => {
      setPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo-icon.png" alt="DPMS" className="w-14 h-14 object-contain animate-fade-in" />
        <svg
          className="animate-spin text-primary-600 w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-300">
        {phrase}…
      </p>
    </div>
  );
}
