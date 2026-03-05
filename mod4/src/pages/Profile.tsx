// MOD4 Profile Page
// Driver details, settings, and logout

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  User, 
  Phone, 
  Mail, 
  Truck, 
  LogOut, 
  Bell, 
  MapPin, 
  Battery,
  Wifi,
  Moon,
  Shield,
  HelpCircle,
  ChevronRight,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Profile() {
  const navigate = useNavigate();
  const { driver, logout } = useAuthStore();
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: true,
    locationTracking: true,
    batterySaver: false,
    darkMode: true,
    offlineMode: true,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!driver) {
    return null;
  }

  return (
    <AppShell title="Profile" showNav={true}>
      <div className="p-4 space-y-6 pb-20">
        {/* Driver Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    {driver.avatar_url ? (
                      <img 
                        src={driver.avatar_url} 
                        alt={driver.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary-foreground">
                        {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-2 border-background flex items-center justify-center">
                    <div className="w-2 h-2 bg-success-foreground rounded-full" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-foreground">{driver.name}</h2>
                  <p className="text-sm text-muted-foreground">Driver ID: {driver.id}</p>
                  {driver.vehicle_id && (
                    <div className="flex items-center gap-1 mt-1">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-mono text-primary">{driver.vehicle_id}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact details */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{driver.email}</span>
                </div>
                {driver.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-foreground">{driver.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </CardTitle>
              <CardDescription>Manage app preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {/* Notifications */}
              <SettingRow
                icon={Bell}
                label="Push Notifications"
                description="Receive delivery updates and alerts"
              >
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={() => toggleSetting('notifications')}
                />
              </SettingRow>

              <Separator className="my-2" />

              {/* Location Tracking */}
              <SettingRow
                icon={MapPin}
                label="Location Tracking"
                description="Enable GPS for route navigation"
              >
                <Switch
                  checked={settings.locationTracking}
                  onCheckedChange={() => toggleSetting('locationTracking')}
                />
              </SettingRow>

              <Separator className="my-2" />

              {/* Battery Saver */}
              <SettingRow
                icon={Battery}
                label="Battery Saver"
                description="Reduce GPS frequency to save battery"
              >
                <Switch
                  checked={settings.batterySaver}
                  onCheckedChange={() => toggleSetting('batterySaver')}
                />
              </SettingRow>

              <Separator className="my-2" />

              {/* Offline Mode */}
              <SettingRow
                icon={Wifi}
                label="Offline Mode"
                description="Cache map tiles for offline use"
              >
                <Switch
                  checked={settings.offlineMode}
                  onCheckedChange={() => toggleSetting('offlineMode')}
                />
              </SettingRow>

              <Separator className="my-2" />

              {/* Dark Mode */}
              <SettingRow
                icon={Moon}
                label="Dark Mode"
                description="Use dark theme for the app"
              >
                <Switch
                  checked={settings.darkMode}
                  onCheckedChange={() => toggleSetting('darkMode')}
                />
              </SettingRow>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardContent className="p-0">
              <LinkRow 
                icon={Shield} 
                label="Privacy & Security" 
                onClick={() => {}} 
              />
              <Separator />
              <LinkRow 
                icon={HelpCircle} 
                label="Help & FAQ" 
                onClick={() => navigate('/support')} 
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* App Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">MOD4 Driver App</p>
            <p className="text-xs text-muted-foreground/60">Version 1.0.0</p>
          </div>
        </motion.div>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-12 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Any unsynced data will be saved locally. You'll need to sign in again to continue deliveries.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary border-0">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      </div>
    </AppShell>
  );
}

// Setting row component
interface SettingRowProps {
  icon: React.ElementType;
  label: string;
  description: string;
  children: React.ReactNode;
}

function SettingRow({ icon: Icon, label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// Link row component
interface LinkRowProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}

function LinkRow({ icon: Icon, label, onClick }: LinkRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}
