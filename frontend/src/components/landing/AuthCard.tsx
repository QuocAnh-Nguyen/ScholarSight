import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, GraduationCap, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuthCardProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  failed: boolean;
  submitting: boolean;
}

/**
 * Auth card adapted from FastGPT's FormLayout pattern.
 *
 * Adds:
 * - Branding header with icon + app name (FastGPT FormLayout header pattern)
 * - Language selector dropdown (FastGPT I18nLngSelector placement)
 * - Improved form layout with centered 380px card width
 * - "or" divider section placeholder for future social login
 *
 * FastGPT source: FastGPT-reference/pageComponents/login/LoginForm/FormLayout.tsx
 */
export function AuthCard({ onLogin, onRegister, failed, submitting }: AuthCardProps) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await onLogin(email.trim(), password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) return;
    await onRegister(email.trim(), password, fullName.trim());
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.resolvedLanguage || i18n.language || "en";

  return (
    <div className="flex flex-col gap-6">
      {/* Branding header — adapted from FastGPT FormLayout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm">
            <GraduationCap className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold text-foreground">
            {t("app.brand")}
          </span>
        </div>

        {/* Language selector — adapted from FastGPT I18nLngSelector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => changeLanguage("en")}
              className={currentLang === "en" ? "bg-accent font-medium" : ""}
            >
              🇬🇧 English
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => changeLanguage("vi")}
              className={currentLang === "vi" ? "bg-accent font-medium" : ""}
            >
              🇻🇳 Tiếng Việt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="w-full max-w-sm border-border/60 shadow-lg">
        <CardContent className="p-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "login" | "register")}
            className="w-full"
          >
            {/* Pill-shaped toggle */}
            <TabsList className="w-full rounded-full p-0.5 h-auto">
              <TabsTrigger
                value="login"
                className="flex-1 rounded-full py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {t("auth.login")}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="flex-1 rounded-full py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                {t("auth.register")}
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 mt-5">
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="current-password"
                  />
                </div>
                {failed && (
                  <p className="text-center text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                    {t("auth.invalidCredentials")}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!email.trim() || !password || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.signingIn")}
                    </>
                  ) : (
                    t("auth.getStarted")
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 mt-5">
                <div className="flex flex-col gap-1.5">
                  <Input
                    placeholder={t("auth.fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                    autoComplete="name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="email"
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="password"
                    placeholder={t("auth.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    autoComplete="new-password"
                  />
                </div>
                {failed && (
                  <p className="text-center text-sm text-destructive animate-in fade-in-0 slide-in-from-top-1">
                    {t("auth.registrationFailed")}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!email.trim() || !password || !fullName.trim() || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.registering")}
                    </>
                  ) : (
                    t("auth.getStarted")
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* "Or" divider — placeholder for future social login (adapted from FastGPT) */}
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {t("auth.trustText")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}