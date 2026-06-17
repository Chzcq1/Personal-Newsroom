/**
 * /auth/login — Sprint 21 Placeholder
 *
 * Authentication is NOT implemented yet.
 * This page is a structural placeholder that will be replaced
 * in Sprint 21 with real auth (email/password or OAuth).
 *
 * Architecture notes for Sprint 21:
 * - Session state will live in AuthContext (to be created)
 * - ProtectedRoute wrapper will check AuthContext before rendering
 * - This page will POST to /api/auth/login (to be created)
 * - Successful login → redirect to / with session cookie
 * - Failed login → error state shown here
 */

import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-white/40" />
          </div>
          <h1 className="text-xl font-bold">Sign in to INFOX</h1>
          <p className="text-sm text-white/40 mt-2">
            Authentication coming in Sprint 21.
          </p>
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-white/60">
            INFOX currently uses anonymous identity.
          </p>
          <p className="text-xs text-white/35">
            Your profile is tied to your device. Full authentication —
            including cross-device sync, subscriptions, and saved preferences —
            will be added in the next sprint.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to app
          </Link>
        </div>

        {/*
          Sprint 21 TODO:
          - [ ] AuthContext with useAuth() hook
          - [ ] POST /api/auth/login → {token, user}
          - [ ] Store JWT in httpOnly cookie (server) or secure localStorage
          - [ ] ProtectedRoute component wrapping admin routes
          - [ ] Redirect to ?next= param after successful login
          - [ ] /auth/signup for new users
          - [ ] /auth/reset for password reset
        */}
      </div>
    </div>
  );
}
