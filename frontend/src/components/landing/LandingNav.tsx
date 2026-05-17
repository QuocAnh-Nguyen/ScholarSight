import { Sun, Moon, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentLocale, setAppLanguage } from "@/i18n";
import {
  localeOption,
  supportedLocales,
  type SupportedLocale,
} from "@/i18n/config";

export function LandingNav() {
  const { theme, toggle } = useTheme();
  const { t } = useTranslation();
  const locale = currentLocale();
  const selected = localeOption(locale);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Brand with logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/logo.png"
            alt="AdmissionsAI Logo"
            className="h-8 w-8 rounded-md object-contain"
          />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            AdmissionsAI
          </span>
        </div>

        {/* Right: Theme toggle + Language dropdown */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="h-8 w-8"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Language switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("settings.language.label")}
                className="h-7 gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>{selected.nativeLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {t("settings.language.label")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(value) => {
                  void setAppLanguage(value as SupportedLocale);
                }}
              >
                {supportedLocales.map((option) => (
                  <DropdownMenuRadioItem key={option.code} value={option.code}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span>{option.nativeLabel}</span>
                      {option.nativeLabel !== option.label ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {option.label}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}