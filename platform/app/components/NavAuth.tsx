"use client";

import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";

export default function NavAuth() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <UserButton />;
  }

  return (
    <SignInButton mode="modal">
      <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition">
        Sign in
      </button>
    </SignInButton>
  );
}
