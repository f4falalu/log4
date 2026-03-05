// MOD4 Notification Center
// In-app notification display and management

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  useNotificationStore,
  NotificationStoreNotification,
  NotificationType
} from '@/stores/notificationStore';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  AlertTriangle,
  Route,
  Clock,
  MessageSquare,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const typeIcons: Record<NotificationType, React.ElementType> = {
  dispatch_alert: Route,
  route_update: Route,
  urgent_message: AlertTriangle,
  delivery_reminder: Clock,
  system_update: Settings,
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-primary/20 text-primary',
  high: 'bg-warning/20 text-warning',
  urgent: 'bg-destructive/20 text-destructive',
};

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    pushEnabled,
    pushPermission,
    markAsRead, 
    markAllAsRead,
    removeNotification,
    clearAll,
    requestPushPermission,
    setPushEnabled,
  } = useNotificationStore();

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      useNotificationStore.getState().setPushPermission(Notification.permission);
    }
  }, []);

  const handleEnablePush = async () => {
    if (pushPermission === 'default') {
      await requestPushPermission();
    } else {
      setPushEnabled(!pushEnabled);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative touch-target"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-primary" />
          ) : (
            <Bell className="w-5 h-5 text-muted-foreground" />
          )}
          
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Push notification toggle */}
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellRing className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="push-toggle" className="text-sm">
                Push Notifications
              </Label>
            </div>
            <Switch
              id="push-toggle"
              checked={pushEnabled && pushPermission === 'granted'}
              onCheckedChange={handleEnablePush}
              disabled={pushPermission === 'denied'}
            />
          </div>
          {pushPermission === 'denied' && (
            <p className="text-xs text-muted-foreground mt-2">
              Notifications blocked. Enable in browser settings.
            </p>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between p-2 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Clear all
            </Button>
          </div>
        )}

        {/* Notification list */}
        <ScrollArea className="flex-1 h-[calc(100vh-220px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                  onRemove={() => removeNotification(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface NotificationItemProps {
  notification: NotificationStoreNotification;
  onRead: () => void;
  onRemove: () => void;
}

function NotificationItem({ notification, onRead, onRemove }: NotificationItemProps) {
  const Icon = typeIcons[notification.type] || MessageSquare;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={cn(
        "p-4 hover:bg-secondary/30 transition-colors relative group",
        !notification.read && "bg-primary/5"
      )}
      onClick={onRead}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          priorityColors[notification.priority]
        )}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "text-sm font-medium truncate",
              !notification.read && "text-foreground"
            )}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          
          {/* Priority badge */}
          {notification.priority === 'urgent' && (
            <Badge variant="destructive" className="mt-2 text-[10px]">
              Urgent
            </Badge>
          )}
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
      >
        <X className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </motion.div>
  );
}
