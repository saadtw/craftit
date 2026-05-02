"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export function InactivityWarningModal({
  isOpen,
  onExtend,
  remainingSeconds = 600,
}) {
  const [timeLeft, setTimeLeft] = useState(remainingSeconds);

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(remainingSeconds);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto logout
          signOut({ callbackUrl: "/auth/login" });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, remainingSeconds]);

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleExtend = () => {
    onExtend();
    setTimeLeft(remainingSeconds);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Session Timeout Warning
          </h2>
        </div>

        <div className="mb-6 space-y-3">
          <p className="text-gray-700">
            Your session is about to expire due to inactivity.
          </p>
          <p className="text-lg font-semibold text-red-600">
            You will be logged out in {minutes}:
            {seconds.toString().padStart(2, "0")}
          </p>
          <p className="text-sm text-gray-500">
            Click "Continue Session" to stay logged in.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Logout Now
          </button>
          <button
            onClick={handleExtend}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue Session
          </button>
        </div>
      </div>
    </div>
  );
}
