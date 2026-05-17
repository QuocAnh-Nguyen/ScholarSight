import { useTranslation } from "react-i18next";
import { Settings, LogOut, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SidebarUserMenuProps {
  userName?: string;
  userEmail?: string;
  avatarUrl?: string;
  collapsed: boolean;
  onSettings: () => void;
  onLogout: () => void;
}

/**
 * User avatar and dropdown menu adapted from FastGPT's ChatSlider BottomSection.
 *
 * In collapsed mode: avatar-only button.
 * In expanded mode: avatar + name + settings/logout dropdown.
 *
 * FastGPT source: FastGPT-reference/pageComponents/chat/slider/index.tsx (lines 355-485)
 */
export function SidebarUserMenu({
  userName,
  userEmail,
  avatarUrl,
  collapsed,
  onSettings,
  onLogout,
}: SidebarUserMenuProps) {
  const { t } = useTranslation();

  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-sidebar-border px-3 py-4">
        <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent transition-all hover:ring-sidebar-accent">
          <AvatarImage src={avatarUrl} alt={userName} />
          <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-accent-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "flex h-10 w-full items-center justify-between gap-3 rounded-md px-2 text-sm font-medium",
              "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarUrl} alt={userName} />
                <AvatarFallback className="bg-sidebar-accent text-[11px] text-sidebar-accent-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-[13px]">{userName || t("sidebar.guest")}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          {/* User info header */}
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={avatarUrl} alt={userName} />
              <AvatarFallback className="bg-sidebar-accent text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-medium">{userName}</span>
              {userEmail && (
                <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
              )}
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSettings}>
            <Settings className="mr-2 h-4 w-4" />
            {t("nav.settings")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            {t("settings.account.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}