import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, useUpdateProfile, useUpdatePreferences, useChangePassword, useUploadAvatar } from '@/hooks/settings/useProfile';
import { Loader2, Upload, Eye, EyeOff, Shield, Bell, Globe, Clock } from 'lucide-react';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Africa/Lagos', label: 'Africa/Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'Africa/Johannesburg', label: 'Africa/Johannesburg (SAST)' },
  { value: 'Africa/Cairo', label: 'Africa/Cairo (EET)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (ET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'ar', label: 'Arabic' },
];

function ProfileInformationCard() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id || '');
  const uploadAvatar = useUploadAvatar(user?.id || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<{
    full_name: string;
    phone: string;
  } | null>(null);

  // Initialize form from profile data once loaded
  const formData = form ?? {
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(formData, {
      onSuccess: () => setForm(null),
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      return; // 1MB limit
    }
    uploadAvatar.mutate(file);
  };

  const hasChanges = form !== null && (
    form.full_name !== (profile?.full_name || '') ||
    form.phone !== (profile?.phone || '')
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Your identity across all workspaces.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {formData.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadAvatar.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Change Avatar
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, GIF or PNG. 1MB max.
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setForm({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Contact support to change your email.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setForm({ ...formData, phone: e.target.value })}
                placeholder="+234 800 000 0000"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending || !hasChanges}>
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CommunicationCard() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updatePrefs = useUpdatePreferences(user?.id || '');

  const prefs = profile?.user_preferences ?? {
    email_notifications: true,
    in_app_notifications: true,
  };

  const handleToggle = (key: 'email_notifications' | 'in_app_notifications', value: boolean) => {
    updatePrefs.mutate({ ...prefs, [key]: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Communication</CardTitle>
            <CardDescription>Manage how you receive notifications.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email Notifications</p>
            <p className="text-xs text-muted-foreground">Receive updates and alerts via email.</p>
          </div>
          <Switch
            checked={prefs.email_notifications}
            onCheckedChange={(v) => handleToggle('email_notifications', v)}
            disabled={updatePrefs.isPending}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">In-App Notifications</p>
            <p className="text-xs text-muted-foreground">Show notifications inside the application.</p>
          </div>
          <Switch
            checked={prefs.in_app_notifications}
            onCheckedChange={(v) => handleToggle('in_app_notifications', v)}
            disabled={updatePrefs.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const { user } = useAuth();
  const changePasswordMutation = useChangePassword();
  const [showForm, setShowForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return;
    if (newPassword !== confirmPassword) return;

    changePasswordMutation.mutate(newPassword, {
      onSuccess: () => {
        setShowForm(false);
        setNewPassword('');
        setConfirmPassword('');
      },
    });
  };

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const tooShort = newPassword.length > 0 && newPassword.length < 8;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your authentication and security settings.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Password</p>
            <p className="text-xs text-muted-foreground">Last changed: unknown</p>
          </div>
          {!showForm && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              Change Password
            </Button>
          )}
        </div>

        {showForm && (
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new_password">New Password</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {tooShort && (
                <p className="text-xs text-destructive">Password must be at least 8 characters.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm Password</Label>
              <Input
                id="confirm_password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
              {passwordMismatch && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  changePasswordMutation.isPending ||
                  tooShort ||
                  passwordMismatch ||
                  !newPassword
                }
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Update Password
              </Button>
            </div>
          </form>
        )}

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Two-Factor Authentication</p>
            <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
          </div>
          <Badge variant="outline">Coming Soon</Badge>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Last Sign In</p>
          </div>
          <span className="text-sm text-muted-foreground">
            {user?.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString()
              : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferencesCard() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const updateProfile = useUpdateProfile(user?.id || '');

  const handleTimezoneChange = (value: string) => {
    updateProfile.mutate({ timezone: value });
  };

  const handleLanguageChange = (value: string) => {
    updateProfile.mutate({ language: value });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your experience.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Timezone
            </Label>
            <Select
              value={profile?.timezone || 'UTC'}
              onValueChange={handleTimezoneChange}
              disabled={updateProfile.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used for timestamps and scheduling.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={profile?.language || 'en'}
              onValueChange={handleLanguageChange}
              disabled={updateProfile.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountStatusCard() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const statusLabel = profile?.user_status === 'activated' ? 'Active'
    : profile?.user_status === 'invited' ? 'Invited'
    : profile?.user_status === 'registered' ? 'Registered'
    : profile?.user_status === 'archived' ? 'Archived'
    : 'Unknown';

  const statusVariant = profile?.user_status === 'activated' ? 'default'
    : profile?.user_status === 'archived' ? 'destructive'
    : 'secondary';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <Badge variant={statusVariant as 'default' | 'secondary' | 'destructive'}>
            {statusLabel}
          </Badge>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Member Since</span>
          <span className="text-sm text-muted-foreground">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString()
              : user?.created_at
              ? new Date(user.created_at).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Updated</span>
          <span className="text-sm text-muted-foreground">
            {profile?.updated_at
              ? new Date(profile.updated_at).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Last Sign In</span>
          <span className="text-sm text-muted-foreground">
            {user?.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString()
              : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Your identity, security, and preferences across all workspaces.
        </p>
      </div>

      <ProfileInformationCard />
      <CommunicationCard />
      <SecurityCard />
      <PreferencesCard />
      <AccountStatusCard />
    </div>
  );
}
