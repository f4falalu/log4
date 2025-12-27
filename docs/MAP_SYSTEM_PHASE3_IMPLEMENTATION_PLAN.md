# Map System Phase 3 - Real-Time Operations

## 📋 Implementation Plan

**Start Date:** Week 4 (Parallel with Phase 2)
**Duration:** 5-6 days development + 2 days testing
**Team Size:** 2-3 developers
**Priority:** HIGH - Critical for operational mode value

---

## Executive Summary

Phase 3 transforms the Operational Map from a static view into a live command center with real-time tracking, notifications, and collaborative features.

**Key Features:**
1. **Live Vehicle Tracking** - Real-time position updates via WebSocket
2. **Real-Time Trade-Off Notifications** - Push notifications for status changes
3. **Collaborative Planning** - Multi-user presence and editing awareness
4. **Live Exception Dashboard** - Real-time exception monitoring and auto-suggestions

**Technical Foundation:**
- Supabase Real-time subscriptions
- WebSocket connections for live updates
- Browser Notification API
- Presence tracking system
- Event-driven architecture

**Business Impact:**
- Reduces Trade-Off confirmation time by 70%
- Enables proactive exception handling
- Improves dispatcher coordination
- Enhances situational awareness

---

## Feature 1: Live Vehicle Tracking

### User Story

**As a** Dispatcher
**I want to** see vehicle positions update in real-time
**So that** I can make informed decisions about Trade-Offs and assignments

### Technical Design

#### Database Schema: Vehicle Position History

```sql
-- Create table for position history
CREATE TABLE vehicle_position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

  -- Position data
  position GEOMETRY(Point, 4326) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2), -- meters above sea level

  -- Movement data
  speed DECIMAL(6, 2), -- km/h
  heading DECIMAL(5, 2), -- degrees (0-360)
  accuracy DECIMAL(8, 2), -- meters

  -- Status
  is_moving BOOLEAN DEFAULT true,
  ignition_on BOOLEAN DEFAULT true,

  -- Metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(50) DEFAULT 'gps', -- 'gps', 'cell_tower', 'wifi', 'manual'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vehicle_positions_vehicle ON vehicle_position_history(vehicle_id);
CREATE INDEX idx_vehicle_positions_recorded_at ON vehicle_position_history(recorded_at DESC);
CREATE INDEX idx_vehicle_positions_geom ON vehicle_position_history USING GIST(position);
CREATE INDEX idx_vehicle_positions_workspace ON vehicle_position_history(workspace_id);

-- Composite index for latest position queries
CREATE INDEX idx_vehicle_positions_latest ON vehicle_position_history(vehicle_id, recorded_at DESC);

-- RLS policies
ALTER TABLE vehicle_position_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view position history in their workspace"
  ON vehicle_position_history FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "System can insert position history"
  ON vehicle_position_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

#### Database Function: Get Latest Vehicle Positions

```sql
CREATE OR REPLACE FUNCTION get_latest_vehicle_positions(
  p_workspace_id UUID,
  p_max_age_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  vehicle_id UUID,
  vehicle_name VARCHAR,
  latitude DECIMAL,
  longitude DECIMAL,
  speed DECIMAL,
  heading DECIMAL,
  last_seen TIMESTAMPTZ,
  is_stale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH latest_positions AS (
    SELECT DISTINCT ON (vph.vehicle_id)
      vph.vehicle_id,
      vph.latitude,
      vph.longitude,
      vph.speed,
      vph.heading,
      vph.recorded_at,
      vph.recorded_at < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL as is_stale
    FROM vehicle_position_history vph
    WHERE vph.workspace_id = p_workspace_id
      AND vph.recorded_at > NOW() - '24 hours'::INTERVAL
    ORDER BY vph.vehicle_id, vph.recorded_at DESC
  )
  SELECT
    lp.vehicle_id,
    v.name as vehicle_name,
    lp.latitude,
    lp.longitude,
    lp.speed,
    lp.heading,
    lp.recorded_at as last_seen,
    lp.is_stale
  FROM latest_positions lp
  JOIN vehicles v ON lp.vehicle_id = v.id
  ORDER BY v.name;
END;
$$ LANGUAGE plpgsql;
```

#### Database Trigger: Update Vehicle Location on Insert

```sql
-- Update vehicles table with latest position
CREATE OR REPLACE FUNCTION update_vehicle_latest_position()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE vehicles
  SET
    latitude = NEW.latitude,
    longitude = NEW.longitude,
    last_location_update = NEW.recorded_at
  WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vehicle_position
  AFTER INSERT ON vehicle_position_history
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_latest_position();
```

#### React Hook: useRealtimeVehiclePositions

```typescript
// src/hooks/useRealtimeVehiclePositions.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface VehiclePosition {
  vehicle_id: string;
  vehicle_name: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  last_seen: string;
  is_stale: boolean;
}

export interface UseRealtimeVehiclePositionsOptions {
  workspaceId: string;
  onUpdate?: (position: VehiclePosition) => void;
  onGeofenceEvent?: (event: GeofenceEvent) => void;
}

export interface GeofenceEvent {
  vehicle_id: string;
  vehicle_name: string;
  zone_id: string;
  zone_name: string;
  action: 'entered' | 'exited';
  timestamp: string;
}

export function useRealtimeVehiclePositions({
  workspaceId,
  onUpdate,
  onGeofenceEvent,
}: UseRealtimeVehiclePositionsOptions) {
  const [positions, setPositions] = useState<Map<string, VehiclePosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    // Fetch initial positions
    const fetchInitialPositions = async () => {
      const { data, error } = await supabase.rpc('get_latest_vehicle_positions', {
        p_workspace_id: workspaceId,
        p_max_age_minutes: 30,
      });

      if (error) {
        console.error('Failed to fetch initial positions:', error);
        return;
      }

      const positionMap = new Map<string, VehiclePosition>();
      data.forEach((pos: VehiclePosition) => {
        positionMap.set(pos.vehicle_id, pos);
      });

      setPositions(positionMap);
    };

    fetchInitialPositions();

    // Subscribe to real-time updates
    const realtimeChannel = supabase
      .channel(`vehicle-positions:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_position_history',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newPosition = payload.new as any;

          const position: VehiclePosition = {
            vehicle_id: newPosition.vehicle_id,
            vehicle_name: '', // Will be populated from existing data
            latitude: newPosition.latitude,
            longitude: newPosition.longitude,
            speed: newPosition.speed,
            heading: newPosition.heading,
            last_seen: newPosition.recorded_at,
            is_stale: false,
          };

          setPositions((prev) => {
            const existing = prev.get(position.vehicle_id);
            if (existing) {
              position.vehicle_name = existing.vehicle_name;
            }
            const updated = new Map(prev);
            updated.set(position.vehicle_id, position);
            return updated;
          });

          onUpdate?.(position);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        } else if (status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    setChannel(realtimeChannel);

    return () => {
      realtimeChannel.unsubscribe();
    };
  }, [workspaceId, onUpdate]);

  return {
    positions: Array.from(positions.values()),
    positionMap: positions,
    isConnected,
    channel,
  };
}
```

#### Map Layer Component: LiveVehicleMarkers

```typescript
// src/components/map/layers/LiveVehicleMarkers.tsx

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useRealtimeVehiclePositions } from '@/hooks/useRealtimeVehiclePositions';

interface LiveVehicleMarkersProps {
  map: L.Map | null;
  workspaceId: string;
  onVehicleClick?: (vehicleId: string) => void;
}

export function LiveVehicleMarkers({
  map,
  workspaceId,
  onVehicleClick,
}: LiveVehicleMarkersProps) {
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailsRef = useRef<Map<string, L.Polyline>>(new Map());

  const { positions, isConnected } = useRealtimeVehiclePositions({
    workspaceId,
    onUpdate: (position) => {
      updateMarkerPosition(position);
      updateTrail(position);
    },
  });

  // Initialize markers for initial positions
  useEffect(() => {
    if (!map) return;

    positions.forEach((position) => {
      if (!markersRef.current.has(position.vehicle_id)) {
        createMarker(position);
      }
    });
  }, [positions, map]);

  const createMarker = (position: VehiclePosition) => {
    if (!map) return;

    // Create custom icon with heading rotation
    const icon = L.divIcon({
      html: `
        <div class="vehicle-marker ${position.is_stale ? 'stale' : ''}" style="transform: rotate(${position.heading || 0}deg)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4 20h16L12 2z" />
          </svg>
        </div>
      `,
      className: 'vehicle-marker-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([position.latitude, position.longitude], { icon })
      .bindPopup(createPopupContent(position))
      .on('click', () => onVehicleClick?.(position.vehicle_id))
      .addTo(map);

    markersRef.current.set(position.vehicle_id, marker);

    // Create trail polyline (last 5 minutes)
    const trail = L.polyline([[position.latitude, position.longitude]], {
      color: '#3b82f6',
      weight: 2,
      opacity: 0.6,
      dashArray: '5, 5',
    }).addTo(map);

    trailsRef.current.set(position.vehicle_id, trail);
  };

  const updateMarkerPosition = (position: VehiclePosition) => {
    const marker = markersRef.current.get(position.vehicle_id);
    if (!marker) {
      createMarker(position);
      return;
    }

    // Smooth animation to new position
    const currentLatLng = marker.getLatLng();
    const newLatLng = L.latLng(position.latitude, position.longitude);

    // Animate marker movement
    let frames = 30;
    let currentFrame = 0;

    const animate = () => {
      currentFrame++;
      const progress = currentFrame / frames;

      const lat = currentLatLng.lat + (newLatLng.lat - currentLatLng.lat) * progress;
      const lng = currentLatLng.lng + (newLatLng.lng - currentLatLng.lng) * progress;

      marker.setLatLng([lat, lng]);

      // Update rotation if heading changed
      if (position.heading !== undefined) {
        const icon = marker.getIcon() as L.DivIcon;
        const newIcon = L.divIcon({
          ...icon.options,
          html: icon.options.html?.replace(
            /transform: rotate\([\d.]+deg\)/,
            `transform: rotate(${position.heading}deg)`
          ),
        });
        marker.setIcon(newIcon);
      }

      if (currentFrame < frames) {
        requestAnimationFrame(animate);
      }
    };

    animate();

    // Update popup content
    marker.setPopupContent(createPopupContent(position));
  };

  const updateTrail = (position: VehiclePosition) => {
    const trail = trailsRef.current.get(position.vehicle_id);
    if (!trail) return;

    const latLngs = trail.getLatLngs() as L.LatLng[];
    latLngs.push(L.latLng(position.latitude, position.longitude));

    // Keep only last 20 points (approximately 5 minutes at 15s intervals)
    if (latLngs.length > 20) {
      latLngs.shift();
    }

    trail.setLatLngs(latLngs);
  };

  const createPopupContent = (position: VehiclePosition): string => {
    const lastSeenDate = new Date(position.last_seen);
    const timeSinceUpdate = Math.floor((Date.now() - lastSeenDate.getTime()) / 1000);

    return `
      <div class="p-2 min-w-[200px]">
        <p class="font-semibold text-sm mb-2">${position.vehicle_name}</p>
        <div class="space-y-1 text-xs text-muted-foreground">
          ${position.speed ? `<p>Speed: ${position.speed.toFixed(1)} km/h</p>` : ''}
          ${position.heading ? `<p>Heading: ${position.heading.toFixed(0)}°</p>` : ''}
          <p>Last Update: ${timeSinceUpdate}s ago</p>
          ${position.is_stale ? '<p class="text-warning font-medium">⚠️ Position stale</p>' : ''}
        </div>
      </div>
    `;
  };

  // Cleanup
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      trailsRef.current.forEach((trail) => trail.remove());
      markersRef.current.clear();
      trailsRef.current.clear();
    };
  }, []);

  return null; // This is a layer component
}
```

#### CSS Styles for Vehicle Markers

```css
/* src/components/map/layers/LiveVehicleMarkers.css */

.vehicle-marker {
  color: #3b82f6; /* blue-500 */
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  transition: transform 0.5s ease-out;
}

.vehicle-marker.stale {
  color: #9ca3af; /* gray-400 */
  opacity: 0.6;
}

.vehicle-marker-icon {
  background: transparent !important;
  border: none !important;
}

/* Pulse animation for active vehicles */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.vehicle-marker:not(.stale) {
  animation: pulse 2s ease-in-out infinite;
}
```

### Implementation Tasks

**Day 1: Database Schema** (4 hours)
- [ ] Create `vehicle_position_history` table
- [ ] Create `get_latest_vehicle_positions()` function
- [ ] Create position update trigger
- [ ] Add indexes and RLS policies
- [ ] Test with mock position data

**Day 2: Real-time Subscriptions** (6 hours)
- [ ] Implement `useRealtimeVehiclePositions` hook
- [ ] Test WebSocket connection stability
- [ ] Add reconnection logic
- [ ] Handle connection errors gracefully

**Day 3: Map Visualization** (6 hours)
- [ ] Build `LiveVehicleMarkers` component
- [ ] Implement smooth marker animation
- [ ] Add position trails (last 5 minutes)
- [ ] Add vehicle heading rotation
- [ ] Style markers with CSS

**Day 4: Testing & Optimization** (4 hours)
- [ ] Test with 50+ concurrent vehicle updates
- [ ] Optimize rendering performance
- [ ] Add connection status indicator
- [ ] Test reconnection after network loss

---

## Feature 2: Real-Time Trade-Off Notifications

### User Story

**As a** Dispatcher
**I want to** receive instant notifications when Trade-Off statuses change
**So that** I can respond quickly and coordinate effectively

### Technical Design

#### Database Schema: Notification Preferences

```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  -- Notification channels
  browser_push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,

  -- Event subscriptions
  subscribe_tradeoff_created BOOLEAN DEFAULT true,
  subscribe_tradeoff_confirmed BOOLEAN DEFAULT true,
  subscribe_tradeoff_rejected BOOLEAN DEFAULT true,
  subscribe_tradeoff_completed BOOLEAN DEFAULT true,
  subscribe_exception_created BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_workspace UNIQUE(user_id, workspace_id)
);

-- RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON user_notification_preferences
  USING (auth.uid() = user_id);
```

#### Database Function: Notify Trade-Off Status Change

```sql
CREATE OR REPLACE FUNCTION notify_tradeoff_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tradeoff RECORD;
  v_source_vehicle VARCHAR;
  v_receiver_vehicles TEXT[];
BEGIN
  -- Only notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get Trade-Off details
  SELECT
    t.*,
    sv.name as source_vehicle_name,
    array_agg(DISTINCT rv.name) as receiver_vehicle_names
  INTO v_tradeoff
  FROM tradeoffs t
  LEFT JOIN vehicles sv ON t.source_vehicle_id = sv.id
  LEFT JOIN tradeoff_items ti ON t.id = ti.tradeoff_id
  LEFT JOIN vehicles rv ON ti.receiver_vehicle_id = rv.id
  WHERE t.id = NEW.id
  GROUP BY t.id, sv.name;

  -- Insert notification event (to be processed by notification service)
  INSERT INTO notification_queue (
    workspace_id,
    event_type,
    event_data,
    target_users,
    created_at
  )
  VALUES (
    NEW.workspace_id,
    'tradeoff_status_changed',
    jsonb_build_object(
      'tradeoff_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'source_vehicle', v_tradeoff.source_vehicle_name,
      'receiver_vehicles', v_tradeoff.receiver_vehicle_names,
      'initiated_by', NEW.initiated_by
    ),
    -- Notify initiator and all involved parties
    (
      SELECT array_agg(DISTINCT user_id)
      FROM (
        SELECT NEW.initiated_by as user_id
        UNION
        SELECT confirmed_by FROM tradeoff_confirmations WHERE tradeoff_id = NEW.id
      ) u
    ),
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_tradeoff_status
  AFTER INSERT OR UPDATE ON tradeoffs
  FOR EACH ROW
  EXECUTE FUNCTION notify_tradeoff_status_change();
```

#### Notification Queue Table

```sql
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,

  target_users UUID[] NOT NULL, -- Array of user IDs to notify

  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_status ON notification_queue(status) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_created ON notification_queue(created_at DESC);
```

#### React Hook: useTradeOffNotifications

```typescript
// src/hooks/useTradeOffNotifications.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface TradeOffNotification {
  id: string;
  tradeoff_id: string;
  old_status: string;
  new_status: string;
  source_vehicle: string;
  receiver_vehicles: string[];
  timestamp: string;
}

export function useTradeOffNotifications(workspaceId: string) {
  const [notifications, setNotifications] = useState<TradeOffNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermission('granted');
      } else if (Notification.permission === 'denied') {
        setPermission('denied');
      } else {
        Notification.requestPermission().then((perm) => {
          setPermission(perm);
        });
      }
    }
  }, []);

  // Subscribe to Trade-Off status changes
  useEffect(() => {
    const channel = supabase
      .channel(`tradeoffs:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tradeoffs',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const oldData = payload.old as any;
          const newData = payload.new as any;

          // Only process status changes
          if (oldData.status === newData.status) return;

          const notification: TradeOffNotification = {
            id: newData.id,
            tradeoff_id: newData.id,
            old_status: oldData.status,
            new_status: newData.status,
            source_vehicle: '', // Will be fetched
            receiver_vehicles: [],
            timestamp: new Date().toISOString(),
          };

          setNotifications((prev) => [notification, ...prev]);

          // Show toast notification
          showNotificationToast(notification);

          // Show browser notification
          showBrowserNotification(notification);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  const showNotificationToast = (notification: TradeOffNotification) => {
    const message = getNotificationMessage(notification);

    switch (notification.new_status) {
      case 'confirmed':
        toast.success(message, {
          action: {
            label: 'View',
            onClick: () => {
              window.location.href = `/fleetops/map/operational?tradeoff=${notification.tradeoff_id}`;
            },
          },
        });
        break;
      case 'rejected':
        toast.error(message);
        break;
      case 'completed':
        toast.success(message);
        break;
      default:
        toast.info(message);
    }
  };

  const showBrowserNotification = (notification: TradeOffNotification) => {
    if (permission !== 'granted') return;

    const message = getNotificationMessage(notification);

    const browserNotif = new Notification('Trade-Off Update', {
      body: message,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: `tradeoff-${notification.tradeoff_id}`,
      requireInteraction: notification.new_status === 'rejected',
    });

    browserNotif.onclick = () => {
      window.focus();
      window.location.href = `/fleetops/map/operational?tradeoff=${notification.tradeoff_id}`;
      browserNotif.close();
    };

    // Auto-close after 10 seconds
    setTimeout(() => browserNotif.close(), 10000);
  };

  const getNotificationMessage = (notification: TradeOffNotification): string => {
    switch (notification.new_status) {
      case 'confirmed':
        return `Trade-Off confirmed by all parties`;
      case 'rejected':
        return `Trade-Off was rejected`;
      case 'completed':
        return `Trade-Off completed successfully`;
      case 'pending_confirmation':
        return `New Trade-Off awaiting confirmation`;
      default:
        return `Trade-Off status changed to ${notification.new_status}`;
    }
  };

  return {
    notifications,
    permission,
    requestPermission: () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(setPermission);
      }
    },
  };
}
```

#### UI Component: Notification Bell

```typescript
// src/components/map/ui/NotificationBell.tsx

import { useState } from 'react';
import { useTradeOffNotifications } from '@/hooks/useTradeOffNotifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, BellOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const { notifications, permission, requestPermission } = useTradeOffNotifications(workspaceId);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {permission !== 'granted' && (
              <Button size="sm" variant="outline" onClick={requestPermission}>
                Enable
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications
              </p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => {
                    window.location.href = `/fleetops/map/operational?tradeoff=${notif.tradeoff_id}`;
                  }}
                >
                  <p className="text-sm font-medium">{notif.source_vehicle}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {notif.old_status} → {notif.new_status}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Implementation Tasks

**Day 1: Database & Triggers** (4 hours)
- [ ] Create `user_notification_preferences` table
- [ ] Create `notification_queue` table
- [ ] Implement `notify_tradeoff_status_change()` trigger
- [ ] Test notification generation

**Day 2: React Hook & Browser Notifications** (5 hours)
- [ ] Implement `useTradeOffNotifications` hook
- [ ] Add Browser Notification API integration
- [ ] Handle permission requests
- [ ] Test notification delivery

**Day 3: UI Components** (3 hours)
- [ ] Build NotificationBell component
- [ ] Add notification list popover
- [ ] Add notification preferences UI
- [ ] Style notifications

---

## Feature 3: Collaborative Planning

### User Story

**As an** Operations Manager
**I want to** see who else is editing zones in real-time
**So that** I can avoid conflicts and coordinate planning efforts

### Technical Design

#### Database Schema: User Presence

```sql
CREATE TABLE user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Context
  map_mode VARCHAR(20) NOT NULL, -- 'operational', 'planning', 'forensics'
  active_entity_type VARCHAR(50), -- 'zone', 'route', 'tradeoff'
  active_entity_id UUID,

  -- Session info
  session_id UUID NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_session UNIQUE(user_id, session_id)
);

CREATE INDEX idx_user_presence_workspace ON user_presence(workspace_id);
CREATE INDEX idx_user_presence_active ON user_presence(last_seen DESC) WHERE last_seen > NOW() - INTERVAL '5 minutes';

-- Auto-cleanup stale presence
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM user_presence WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Run cleanup every minute (via pg_cron or application)
```

#### React Hook: useUserPresence

```typescript
// src/hooks/useUserPresence.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export interface UserPresence {
  user_id: string;
  user_name: string;
  user_avatar?: string;
  map_mode: 'operational' | 'planning' | 'forensics';
  active_entity_type?: string;
  active_entity_id?: string;
  last_seen: string;
}

export function useUserPresence(
  workspaceId: string,
  mapMode: 'operational' | 'planning' | 'forensics'
) {
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [sessionId] = useState(() => uuidv4());

  // Heartbeat: Update presence every 10 seconds
  useEffect(() => {
    const updatePresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_presence').upsert({
        workspace_id: workspaceId,
        user_id: user.id,
        map_mode: mapMode,
        session_id: sessionId,
        last_seen: new Date().toISOString(),
      });
    };

    // Initial update
    updatePresence();

    // Periodic updates
    const interval = setInterval(updatePresence, 10000);

    return () => {
      clearInterval(interval);

      // Cleanup on unmount
      supabase.from('user_presence').delete().eq('session_id', sessionId);
    };
  }, [workspaceId, mapMode, sessionId]);

  // Subscribe to presence changes
  useEffect(() => {
    const fetchPresence = async () => {
      const { data, error } = await supabase
        .from('user_presence')
        .select(`
          *,
          user:auth.users(id, email, raw_user_meta_data)
        `)
        .eq('workspace_id', workspaceId)
        .eq('map_mode', mapMode)
        .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) {
        console.error('Failed to fetch presence:', error);
        return;
      }

      setPresence(
        data.map((p: any) => ({
          user_id: p.user_id,
          user_name: p.user?.raw_user_meta_data?.name || p.user?.email || 'Unknown',
          user_avatar: p.user?.raw_user_meta_data?.avatar_url,
          map_mode: p.map_mode,
          active_entity_type: p.active_entity_type,
          active_entity_id: p.active_entity_id,
          last_seen: p.last_seen,
        }))
      );
    };

    fetchPresence();

    const channel = supabase
      .channel(`presence:${workspaceId}:${mapMode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchPresence();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId, mapMode]);

  const updateActiveEntity = async (entityType?: string, entityId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_presence')
      .update({
        active_entity_type: entityType,
        active_entity_id: entityId,
      })
      .eq('session_id', sessionId);
  };

  return {
    presence,
    updateActiveEntity,
  };
}
```

#### UI Component: ActiveUsersList

```typescript
// src/components/map/ui/ActiveUsersList.tsx

import { useUserPresence } from '@/hooks/useUserPresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

export function ActiveUsersList({
  workspaceId,
  mapMode,
}: {
  workspaceId: string;
  mapMode: 'operational' | 'planning' | 'forensics';
}) {
  const { presence } = useUserPresence(workspaceId, mapMode);

  const { data: { user: currentUser } } = supabase.auth.getUser();

  const otherUsers = presence.filter((p) => p.user_id !== currentUser?.id);

  if (otherUsers.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 z-[900] bg-background border rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Active Users ({otherUsers.length})</span>
      </div>

      <div className="space-y-2">
        {otherUsers.map((user) => (
          <div key={user.user_id} className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={user.user_avatar} />
              <AvatarFallback>{user.user_name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.user_name}</p>
              {user.active_entity_type && (
                <p className="text-xs text-muted-foreground">
                  Editing {user.active_entity_type}
                </p>
              )}
            </div>
            <Badge variant="secondary" className="h-2 w-2 rounded-full p-0 bg-green-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Implementation Tasks

**Day 1: Database & Presence Tracking** (4 hours)
- [ ] Create `user_presence` table
- [ ] Implement heartbeat mechanism
- [ ] Add cleanup for stale presence
- [ ] Test multi-user scenarios

**Day 2: React Hook** (3 hours)
- [ ] Implement `useUserPresence` hook
- [ ] Add active entity tracking
- [ ] Test real-time updates

**Day 3: UI Integration** (3 hours)
- [ ] Build ActiveUsersList component
- [ ] Add to all map modes
- [ ] Style with avatars and status indicators

---

## Feature 4: Live Exception Dashboard

### User Story

**As a** Dispatcher
**I want to** see exceptions appear in real-time
**So that** I can initiate Trade-Offs proactively

### Technical Design

#### Database Schema: Exception Events

```sql
CREATE TABLE exception_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  -- Exception details
  exception_type VARCHAR(100) NOT NULL, -- 'vehicle_delayed', 'driver_unavailable', 'item_shortage', etc.
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'

  -- Related entities
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  delivery_id UUID REFERENCES deliveries(id),
  batch_id UUID REFERENCES delivery_batches(id),

  -- Status
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_method VARCHAR(50), -- 'tradeoff', 'manual_reassignment', 'cancelled', etc.

  -- Auto-suggestion
  suggested_tradeoff_id UUID REFERENCES tradeoffs(id),
  suggestion_confidence DECIMAL(3, 2), -- 0.00 to 1.00

  -- Metadata
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exception_events_unresolved ON exception_events(resolved, severity) WHERE NOT resolved;
CREATE INDEX idx_exception_events_created ON exception_events(created_at DESC);
CREATE INDEX idx_exception_events_workspace ON exception_events(workspace_id);
```

#### React Hook: useRealtimeExceptions

```typescript
// src/hooks/useRealtimeExceptions.ts

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExceptionEvent {
  id: string;
  exception_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  vehicle_id?: string;
  driver_id?: string;
  description: string;
  suggested_tradeoff_id?: string;
  suggestion_confidence?: number;
  created_at: string;
}

export function useRealtimeExceptions(workspaceId: string) {
  const [exceptions, setExceptions] = useState<ExceptionEvent[]>([]);

  useEffect(() => {
    // Fetch initial exceptions
    const fetchExceptions = async () => {
      const { data, error } = await supabase
        .from('exception_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch exceptions:', error);
        return;
      }

      setExceptions(data);
    };

    fetchExceptions();

    // Subscribe to new exceptions
    const channel = supabase
      .channel(`exceptions:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exception_events',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const newException = payload.new as ExceptionEvent;
          setExceptions((prev) => [newException, ...prev]);

          // Show alert for critical exceptions
          if (newException.severity === 'critical') {
            toast.error(`Critical Exception: ${newException.description}`, {
              duration: Infinity,
              action: {
                label: 'View',
                onClick: () => {
                  // Navigate to exception
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  return { exceptions };
}
```

#### UI Component: ExceptionDashboard

```typescript
// src/components/map/panels/ExceptionDashboard.tsx

import { useRealtimeExceptions } from '@/hooks/useRealtimeExceptions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info, Zap } from 'lucide-react';

export function ExceptionDashboard({ workspaceId }: { workspaceId: string }) {
  const { exceptions } = useRealtimeExceptions(workspaceId);

  const criticalCount = exceptions.filter((e) => e.severity === 'critical').length;

  return (
    <Card className="w-96">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Live Exceptions</span>
          <Badge variant="destructive">{criticalCount} Critical</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {exceptions.map((exception) => (
            <div key={exception.id} className="p-3 border rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {exception.severity === 'critical' && (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                  {exception.severity === 'high' && (
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  )}
                  {exception.severity === 'medium' && (
                    <Info className="h-4 w-4 text-info" />
                  )}
                  <span className="text-sm font-medium">
                    {exception.exception_type.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <Badge variant={exception.severity === 'critical' ? 'destructive' : 'secondary'}>
                  {exception.severity}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">{exception.description}</p>

              {exception.suggested_tradeoff_id && (
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs mb-2">
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-blue-600" />
                    <span className="font-medium">Auto-suggested Trade-Off</span>
                    <span className="text-muted-foreground">
                      ({Math.round((exception.suggestion_confidence || 0) * 100)}% confidence)
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" variant="default">
                  Initiate Trade-Off
                </Button>
                <Button size="sm" variant="outline">
                  Dismiss
                </Button>
              </div>
            </div>
          ))}

          {exceptions.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No active exceptions</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Implementation Tasks

**Day 1: Database Schema** (3 hours)
- [ ] Create `exception_events` table
- [ ] Add indexes and RLS
- [ ] Create mock exception generator for testing

**Day 2: Real-time Hook** (4 hours)
- [ ] Implement `useRealtimeExceptions` hook
- [ ] Add severity-based alerting
- [ ] Test subscription updates

**Day 3: UI Dashboard** (4 hours)
- [ ] Build ExceptionDashboard component
- [ ] Add to Operational Map page
- [ ] Integrate with Trade-Off initiation
- [ ] Style exception cards

---

## Testing Strategy

### Performance Testing

**Load Test: 100 Concurrent Vehicles**
```typescript
// Generate 100 position updates per second
for (let i = 0; i < 100; i++) {
  await supabase.from('vehicle_position_history').insert({
    workspace_id,
    vehicle_id: vehicles[i].id,
    latitude: randomLat(),
    longitude: randomLng(),
    speed: randomSpeed(),
    heading: randomHeading(),
  });
}

// Verify:
// - All markers update within 1 second
// - No frame drops
// - Memory usage stable
```

**WebSocket Stability Test**
```typescript
// Test reconnection after network interruption
await simulateNetworkLoss(5000); // 5 second disconnect

// Verify:
// - Automatic reconnection
// - No data loss
// - Catch-up on missed updates
```

### Integration Tests

- 5 dispatchers receive Trade-Off notifications simultaneously
- Browser notifications appear on multiple devices
- Presence tracking shows all active users
- Exception dashboard updates in <500ms

---

## Deployment Plan

**Week 1: Staging Deployment**
- Deploy database migrations
- Deploy frontend with feature flags OFF
- Enable for internal testing only

**Week 2: Internal UAT**
- Test with 10 internal users
- Simulate 50+ vehicle updates per minute
- Verify notification delivery
- Monitor WebSocket stability

**Week 3: Production Rollout**
- Enable for 20% of users (canary deployment)
- Monitor error rates and performance
- Gradual rollout to 50%, then 100%

---

## Success Metrics

**Performance:**
- Position updates rendered in <100ms
- WebSocket connection uptime >99.9%
- Notification delivery in <2 seconds
- Exception detection in <1 second

**Adoption:**
- 90% of dispatchers enable notifications within 1 week
- 100+ Trade-Offs initiated from exception dashboard in Month 1
- Average response time to exceptions reduced by 70%

**User Satisfaction:**
- NPS score >8/10
- 80% report improved situational awareness
- Zero complaints about notification spam

---

**Document Version:** 1.0
**Status:** Ready for Development
**Priority:** HIGH (Parallel with Phase 2)
**Dependencies:** Phase 1 production deployment
