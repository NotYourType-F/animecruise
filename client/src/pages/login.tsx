import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Eye, EyeOff, Check, ArrowRight } from "lucide-react";
const logoUrl = "/logo.png";
import { useAvatars } from "./profile";

type Mode = "login" | "register";

export default function Login() {
  const { isLoggedIn, login, register } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: avatars = [] } = useAvatars();

  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/profile");
    }
  }, [isLoggedIn, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login.mutateAsync({ username, password });
        toast({ title: "Welcome back!" });
      } else {
        await register.mutateAsync({
          username,
          password,
          email: email || undefined,
          avatarUrl: selectedAvatar || undefined,
        });
        toast({ title: "Account created! You're now signed in." });
      }
    } catch (error: any) {
      const msg = error.message?.includes(":") ? error.message.split(":").slice(1).join(":").trim() : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const isPending = login.isPending || register.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" data-testid="page-login">
      {/* Animated gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <img src={logoUrl} alt="AnimeCruise" className="h-16 w-auto object-contain mx-auto mb-4 drop-shadow-lg animate-float-slow" />
          <h1 className="text-2xl font-bold text-white/90 mb-1">
            {mode === "login" ? "Welcome Back" : "Join AnimeCruise"}
          </h1>
          <p className="text-sm text-white/30">
            {mode === "login" ? "Sign in to access your bookmarks and history" : "Create your account to get started"}
          </p>
        </div>

        <div className="liquid-glass rounded-2xl border border-white/[0.08] p-6 animate-border-glow hover:shadow-lg hover:shadow-purple-500/5 transition-shadow duration-500">
          <div className="flex mb-6 bg-white/[0.03] rounded-xl p-1 border border-white/[0.06]">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "login" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/30 hover:text-white/50"
                }`}
              data-testid="tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${mode === "register" ? "bg-white/[0.08] text-white shadow-sm" : "text-white/30 hover:text-white/50"
                }`}
              data-testid="tab-register"
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80 placeholder:text-white/15"
                  required
                  data-testid="input-username"
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80 placeholder:text-white/15"
                    data-testid="input-email"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-white/30 uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "login" ? "Enter password" : "Min 6 characters"}
                  className="pl-10 pr-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80 placeholder:text-white/15"
                  required
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-xs text-white/30 uppercase tracking-wider mb-3 block">Choose Your Avatar</label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${selectedAvatar === avatar.url
                        ? "border-white shadow-lg shadow-white/10 ring-1 ring-white/20"
                        : "border-white/[0.06] hover:border-white/[0.15]"
                        }`}
                      title={avatar.name}
                      data-testid={`avatar-${avatar.id}`}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                      {selectedAvatar === avatar.url && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 text-white font-semibold hover:from-purple-500 hover:via-purple-400 hover:to-blue-400 h-11 gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 border border-purple-400/20"
              data-testid="button-submit"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-white/50 hover:text-white/70 underline underline-offset-2"
            data-testid="link-switch-mode"
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
