// client/src/components/OfflineToast.tsx
// Shows a Sonner toast when the user goes offline / comes back online.
// Mount this once at the app root.

import { useEffect } from "react";
import { toast } from "sonner";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineToast() {
  useEffect(() => {
    function handleOffline() {
      toast("You're offline", {
        description:
          "Favorites are still available. New recipes will load when you reconnect.",
        icon: <WifiOff className="h-4 w-4 text-yellow-500" aria-hidden />,
        duration: Infinity, // keep it visible until they're back online
        id: "offline-toast",
      });
    }

    function handleOnline() {
      toast.dismiss("offline-toast");
      toast.success("Back online", {
        description: "Your connection has been restored.",
        icon: <Wifi className="h-4 w-4 text-green-500" aria-hidden />,
        duration: 3_000,
      });
    }

    // Also fire immediately if already offline when the component mounts
    if (!navigator.onLine) handleOffline();

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
