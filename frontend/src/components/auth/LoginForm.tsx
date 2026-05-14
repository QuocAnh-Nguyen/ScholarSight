import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm({
  failed,
  onLogin,
  onSwitchToRegister,
}: {
  failed: boolean;
  onLogin: (email: string, password: string) => void;
  onSwitchToRegister: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    onLogin(email.trim(), password);
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🎓 ScholarSight</CardTitle>
          <CardDescription>{t("app.auth.hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t("app.auth.loginTab")}</TabsTrigger>
              <TabsTrigger value="register" onClick={onSwitchToRegister}>
                {t("app.auth.registerTab")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                {failed && (
                  <p className="text-center text-sm text-destructive">
                    {t("app.auth.invalid")}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">{t("app.auth.emailLabel")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t("app.auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-password">{t("app.auth.passwordLabel")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder={t("app.auth.placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!email.trim() || !password || submitting}
                >
                  {submitting ? t("app.auth.loggingIn") : t("app.auth.submit")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("app.auth.switchToRegister")}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function RegisterForm({
  failed,
  onRegister,
  onSwitchToLogin,
}: {
  failed: boolean;
  onRegister: (email: string, password: string, fullName: string) => void;
  onSwitchToLogin: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !fullName.trim()) return;
    setSubmitting(true);
    onRegister(email.trim(), password, fullName.trim());
  };

  return (
    <div className="flex h-full w-full items-center justify-center px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🎓 ScholarSight</CardTitle>
          <CardDescription>{t("app.auth.hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="register" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" onClick={onSwitchToLogin}>
                {t("app.auth.loginTab")}
              </TabsTrigger>
              <TabsTrigger value="register">{t("app.auth.registerTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="register">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
                {failed && (
                  <p className="text-center text-sm text-destructive">
                    {t("app.auth.invalid")}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-name">{t("app.auth.fullNameLabel")}</Label>
                  <Input
                    id="reg-name"
                    placeholder={t("app.auth.fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={submitting}
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-email">{t("app.auth.emailLabel")}</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder={t("app.auth.emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="reg-password">{t("app.auth.passwordLabel")}</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder={t("app.auth.placeholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!email.trim() || !password || !fullName.trim() || submitting}
                >
                  {submitting ? t("app.auth.registering") : t("app.auth.registerTab")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("app.auth.switchToLogin")}
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}