import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { Loader2 } from "lucide-react";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";

// Lazy-loaded Pages
const Login = lazy(() => import("./pages/auth/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ShopManagement = lazy(() => import("./pages/admin/ShopManagement"));
const Advertisements = lazy(() => import("./pages/admin/Advertisements"));
const Feedback = lazy(() => import("./pages/admin/Feedback"));

function AdminLoader({ message = "Loading workspace..." }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-3 bg-slate-50 p-4 select-none">
      <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <p className="text-xs text-slate-400">Please wait a moment...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AdminLoader />}>
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              <Login
                role="admin"
                title="Admin Portal"
                subtitle="Sign In to Manage Orgination"
              />
            }
          />

          {/* <Route path="/register" element={<Register />}/> */}

          <Route element={<ProtectedRoute allowedRoles={["ADMIN", "OWNER", "STAFF"]} />}>
            <Route element={<Layout />}>
              <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/shops" element={<ShopManagement />} />
                <Route path="/admin/advertisements" element={<Advertisements />} />
                <Route path="/admin/feedback" element={<Feedback />} />
              </Route>
            </Route>
          </Route>

          {/* Default */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}