import { WifiOff, AlertTriangle } from "lucide-react";
import { useOffline } from "@/contexts/OfflineContext";

export function OfflineBanner() {
  const { isOffline, rateLimitInfo } = useOffline();

  const isRateLimited = rateLimitInfo.remaining <= 10;

  if (!isOffline && !isRateLimited) return null;

  return (
    <div className="flex flex-col">
      {isOffline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="h-4 w-4" />
          <span>You're offline. Showing cached data.</span>
        </div>
      )}
      {isRateLimited && !isOffline && (
        <div className="bg-orange-500 text-orange-950 px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>
            {rateLimitInfo.remaining === 0
              ? `Rate limit reached. Showing cached data. Resets in ${rateLimitInfo.resetInMinutes} min.`
              : `${rateLimitInfo.remaining}/${rateLimitInfo.total} API requests remaining this hour.`}
          </span>
        </div>
      )}
    </div>
  );
}
