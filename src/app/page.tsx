"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ROLE_REDIRECTS } from "@/config/permissions";
import RefreshLoader from "@/components/Loading";

export default function Root() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated && user) {
      const destination =
        ROLE_REDIRECTS[user.role as keyof typeof ROLE_REDIRECTS] ||
        "/admin/dashboard";
      router.replace(destination);
    } else {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, user, router]);

  return <RefreshLoader isOpen={true} />;
}
