import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getRateLimitInfo } from "@/lib/apiCache";

interface RateLimitInfo {
  remaining: number;
  total: number;
  resetInMinutes: number;
}

interface OfflineContextType {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  rateLimitInfo: RateLimitInfo;
  refreshRateLimitInfo: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    isOnline ? new Date() : null,
  );
  const [rateLimitInfo, setRateLimitInfo] =
    useState<RateLimitInfo>(getRateLimitInfo());

  const refreshRateLimitInfo = () => {
    setRateLimitInfo(getRateLimitInfo());
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Refresh rate limit info periodically
    const rateLimitInterval = setInterval(refreshRateLimitInfo, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(rateLimitInterval);
    };
  }, [isOnline]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        isOffline: !isOnline,
        lastOnlineAt,
        rateLimitInfo,
        refreshRateLimitInfo,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}

// Helper to get cache validity based on online status
export function getCacheValidity(isOnline: boolean): number {
  // When online: 30 minutes (existing behavior)
  // When offline: 24 hours (extended for offline use)
  return isOnline ? 30 * 60_000 : 24 * 60 * 60_000;
}
