"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Паролата трябва да е поне 8 символа");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат");
      return;
    }

    setLoading(true);

    try {
      await api.request("/auth/set-password", {
        method: "POST",
        body: { password },
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Грешка при смяна на парола");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">Stocka</span>
            </div>
          </div>
          <CardTitle>Сменете паролата си</CardTitle>
          <CardDescription>
            {user?.mustChangePassword
              ? "Трябва да зададете нова парола преди да продължите"
              : "Изберете нова парола"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Нова парола"
              type="password"
              placeholder="Минимум 8 символа"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label="Потвърдете паролата"
              type="password"
              placeholder="Въведете паролата отново"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" size="lg" disabled={loading} className="w-full mt-2">
              {loading ? "Запазване..." : "Задай нова парола"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
