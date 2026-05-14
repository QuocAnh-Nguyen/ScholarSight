import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface AuthCardProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, fullName: string) => Promise<void>;
  failed: boolean;
  submitting: boolean;
}

export function AuthCard({ onLogin, onRegister, failed, submitting }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

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

  return (
    <Card className="w-full max-w-sm border-border/60 shadow-lg">
      <CardContent className="p-6 pt-6">
        <Tabs defaultValue="login" className="w-full">
          {/* Pill-shaped toggle */}
          <TabsList className="w-full rounded-full p-0.5 h-auto">
            <TabsTrigger
              value="login"
              className="flex-1 rounded-full py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              Login
            </TabsTrigger>
            <TabsTrigger
              value="register"
              className="flex-1 rounded-full py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              Register
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 mt-5">
              {failed && (
                <p className="text-center text-sm text-destructive">
                  Invalid email or password
                </p>
              )}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || !password || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4 mt-5">
              {failed && (
                <p className="text-center text-sm text-destructive">
                  Registration failed. Please try again.
                </p>
              )}
              <Input
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={submitting}
              />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={!email.trim() || !password || !fullName.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          * Trusted by thousands of high school students.
        </p>
      </CardContent>
    </Card>
  );
}