import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Mail, Lock, Check, ArrowLeft, Eye, EyeOff, Pencil, Save } from "lucide-react";

export type AvatarOption = { id: string; name: string; url: string };

export function useAvatars() {
  return useQuery<AvatarOption[]>({
    queryKey: ["/api/avatars"],
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export default function Profile() {
  const { user, isLoading, isLoggedIn, logout, updateProfile } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: avatars = [] } = useAvatars();

  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const startEdit = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email || "");
      setSelectedAvatar(user.avatarUrl || "");
      setCurrentPassword("");
      setNewPassword("");
    }
    setEditMode(true);
  };

  const handleSave = async () => {
    try {
      const data: any = {};
      if (username !== user?.username) data.username = username;
      if (email !== (user?.email || "")) data.email = email;
      if (selectedAvatar !== (user?.avatarUrl || "")) data.avatarUrl = selectedAvatar;
      if (newPassword) {
        data.currentPassword = currentPassword;
        data.newPassword = newPassword;
      }
      await updateProfile.mutateAsync(data);
      setEditMode(false);
      toast({ title: "Profile updated" });
    } catch (error: any) {
      const msg = error.message?.includes(":") ? error.message.split(":").slice(1).join(":").trim() : error.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    navigate("/");
    toast({ title: "Logged out" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4" data-testid="page-profile">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" className="rounded-xl text-white/40" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white/90">My Profile</h1>
        </div>

        <div className="liquid-glass rounded-2xl border border-white/[0.08] p-6 mb-6">
          <div className="flex flex-col items-center text-center py-4 mb-4">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-white/[0.12] bg-white/[0.04] mb-4 shadow-lg shadow-black/20">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" data-testid="img-avatar" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" data-testid="img-avatar-placeholder">
                  <User className="w-10 h-10 text-white/20" />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white/90 mb-1" data-testid="text-username">{user?.username}</h2>
            {user?.email && <p className="text-sm text-white/40" data-testid="text-email">{user.email}</p>}
            <p className="text-xs text-white/15 mt-1.5">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "recently"}
            </p>
          </div>

          <div className="flex gap-2 justify-center mb-6">
            {!editMode && (
              <Button variant="outline" size="sm" onClick={startEdit} className="rounded-xl border-white/[0.08] text-white/50 gap-1.5" data-testid="button-edit-profile">
                <Pencil className="w-3.5 h-3.5" /> Edit Profile
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout} className="rounded-xl border-white/[0.08] text-red-400/60 hover:text-red-400 gap-1.5" data-testid="button-logout">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </Button>
          </div>

          {editMode && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80"
                    data-testid="input-edit-username"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Email (optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80"
                    data-testid="input-edit-email"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-2 block">Change Password</label>
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      type={showCurrentPass ? "text" : "password"}
                      placeholder="Current password"
                      className="pl-10 pr-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80"
                      data-testid="input-current-password"
                    />
                    <button onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type={showNewPass ? "text" : "password"}
                      placeholder="New password"
                      className="pl-10 pr-10 bg-white/[0.03] border-white/[0.08] rounded-xl text-white/80"
                      data-testid="input-new-password"
                    />
                    <button onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40">
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-white/30 uppercase tracking-wider mb-3 block">Choose Avatar</label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2.5">
                  {avatars.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-105 ${
                        selectedAvatar === avatar.url
                          ? "border-white shadow-lg shadow-white/10 ring-1 ring-white/20"
                          : "border-white/[0.06] hover:border-white/[0.15]"
                      }`}
                      title={avatar.name}
                      data-testid={`avatar-option-${avatar.id}`}
                    >
                      <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                      {selectedAvatar === avatar.url && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={updateProfile.isPending}
                  className="rounded-xl bg-white text-black hover:bg-white/90 gap-1.5"
                  data-testid="button-save-profile"
                >
                  <Save className="w-4 h-4" /> {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  className="rounded-xl border-white/[0.08] text-white/40"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
