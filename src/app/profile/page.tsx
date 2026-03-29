'use client';

import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const signOut = useAuthStore(s => s.signOut);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-100 mb-4">
            Not authenticated
          </h1>
          <p className="text-zinc-400">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-zinc-100 mb-8">My Profile</h1>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-400">
                Email
              </label>
              <p className="text-zinc-100">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400">
                User ID
              </label>
              <p className="text-zinc-100 font-mono text-sm">{user.id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400">
                Created At
              </label>
              <p className="text-zinc-100">
                {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400">
                Last Sign In
              </label>
              <p className="text-zinc-100">
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-6">
          <h2 className="text-xl font-semibold text-zinc-200 mb-4">
            Account Actions
          </h2>
          <button
            onClick={handleSignOut}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-red-700 active:bg-red-800"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
