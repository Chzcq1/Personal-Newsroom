import { Link, useLocation } from "wouter";
import { Newspaper, Compass, Star, User } from "lucide-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/my-feed", label: "For You", Icon: Newspaper },
  { href: "/discover", label: "Discover", Icon: Compass },
  { href: "/watchlist", label: "Watchlist", Icon: Star },
  { href: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} to={href}>
              <button
                className={[
                  "flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
                aria-label={label}
              >
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.8} />
                </motion.div>
                <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : ""}`}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
