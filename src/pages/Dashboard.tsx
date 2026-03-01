// MOD4 Dashboard
// Driver-focused execution view: batch status, active delivery, quick actions

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/stores/authStore';
import { useBatchStore } from '@/stores/batchStore';
import { useSyncStore } from '@/lib/sync/machine';
import { Slot, Facility, ProofOfDelivery } from '@/lib/db/schema';
import { createEvent } from '@/lib/db/events';
import { SlotChecklist, DeliverySheet, DeliveryData } from '@/components/delivery';
import { downloadPoDPdf } from '@/lib/pdf/generatePoDPdf';
import { supabase } from '@/integrations/supabase';
import {
  Package, MapPin, Clock, ChevronRight,
  CheckCircle2, AlertCircle, CircleDot,
  Navigation, Phone, Truck, LogOut,
  Wifi, WifiOff, RefreshCw, Route,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const navigate = useNavigate();
  const { driver, logout } = useAuthStore();
  const { setBatch, setSlots, slots, facilities, currentBatch } = useBatchStore();
  const { triggerSync, pendingCount, errorCount } = useSyncStore();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFetchingBatch, setIsFetchingBatch] = useState(false);
  const [deliverySheetOpen, setDeliverySheetOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Track online/offline status
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Fetch assigned batch from Supabase
  useEffect(() => {
    if (!driver) return;
    fetchActiveBatch();
  }, [driver]);

  const fetchActiveBatch = useCallback(async () => {
    if (!driver) return;
    setIsFetchingBatch(true);

    try {
      // Look for an active/assigned batch for this driver
      // delivery_batches.driver_id references the drivers table
      const { data: batches, error } = await supabase
        .from('delivery_batches' as any)
        .select('*')
        .eq('driver_id', driver.id)
        .in('status', ['assigned', 'active', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1) as { data: any[] | null; error: any };

      if (error) {
        console.warn('[MOD4] Failed to fetch batch:', error.message);
      } else if (batches && batches.length > 0) {
        const raw = batches[0] as any;
        // facility_ids is a UUID[] column on delivery_batches
        const facilityIds: string[] = raw.facility_ids || [];

        let mappedFacilities: Facility[] = [];
        let mappedSlots: Slot[] = [];

        if (facilityIds.length > 0) {
          // Fetch facility details for the IDs in the batch
          const { data: facilityData } = await supabase
            .from('facilities')
            .select('id, name, address, latitude, longitude, type, contact_name, contact_phone')
            .in('id', facilityIds);

          // Build a lookup map for facility data
          const facilityMap = new Map(
            (facilityData || []).map((f: any) => [f.id, f])
          );

          // Map facilities in the order they appear in facility_ids
          mappedFacilities = facilityIds.map((fid: string) => {
            const f = facilityMap.get(fid) as any;
            return {
              id: fid,
              name: f?.name || 'Unknown',
              address: f?.address || '',
              lat: f?.latitude || 0,
              lng: f?.longitude || 0,
              type: f?.type || 'facility',
              contact_name: f?.contact_name,
              contact_phone: f?.contact_phone,
            };
          });

          // Create slots from the facility list (one slot per facility, ordered)
          mappedSlots = facilityIds.map((fid: string, i: number) => ({
            id: `${raw.id}-${fid}`,
            batch_id: raw.id,
            facility_id: fid,
            sequence: i + 1,
            status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending',
          }));
        }

        setBatch({
          id: raw.id,
          driver_id: driver.id,
          vehicle_id: raw.vehicle_id || '',
          status: raw.status === 'assigned' ? 'assigned' : 'active',
          estimated_duration: raw.estimated_duration,
          facilities: mappedFacilities,
          slots: mappedSlots,
          created_at: new Date(raw.created_at).getTime(),
          updated_at: Date.now(),
          cached_at: Date.now(),
        });
      }
    } catch (err) {
      console.warn('[MOD4] Batch fetch error:', err);
    } finally {
      setIsFetchingBatch(false);
    }
  }, [driver, setBatch]);

  const activeSlot = slots.find(s => s.status === 'active');
  const pendingSlots = slots.filter(s => s.status === 'pending');
  const completedSlots = slots.filter(s => s.status === 'delivered' || s.status === 'skipped');

  const selectedFacility = selectedSlot
    ? facilities.find(f => f.id === selectedSlot.facility_id)
    : null;

  const handleSlotSelect = useCallback((slot: Slot) => {
    setSelectedSlot(slot);
    setDeliverySheetOpen(true);
  }, []);

  const handleOpenDelivery = useCallback(() => {
    if (activeSlot) {
      setSelectedSlot(activeSlot);
      setDeliverySheetOpen(true);
    }
  }, [activeSlot]);

  const handleConfirmDelivery = useCallback(async (data: DeliveryData) => {
    if (!selectedSlot || !driver || !currentBatch) return;

    await createEvent({
      type: 'slot_delivered',
      driver_id: driver.id,
      batch_id: currentBatch.id,
      slot_id: selectedSlot.id,
      facility_id: selectedSlot.facility_id,
      payload: {
        photo_uri: data.photo,
        signature_uri: data.signature,
        notes: data.notes,
      },
    });

    const updatedSlots = slots.map(s => {
      if (s.id === selectedSlot.id) {
        return { ...s, status: 'delivered' as const, actual_time: Date.now(), photo_uri: data.photo ?? undefined, signature_uri: data.signature ?? undefined, notes: data.notes };
      }
      if (s.status === 'pending' && s.sequence === selectedSlot.sequence + 1) {
        return { ...s, status: 'active' as const };
      }
      return s;
    });

    setSlots(updatedSlots);
    triggerSync();

    toast.success('Delivery confirmed!', {
      description: `${selectedFacility?.name} marked as delivered`,
    });
  }, [selectedSlot, driver, currentBatch, slots, setSlots, triggerSync, selectedFacility]);

  const handleSkipDelivery = useCallback(async (reason: string) => {
    if (!selectedSlot || !driver || !currentBatch) return;

    await createEvent({
      type: 'slot_skipped',
      driver_id: driver.id,
      batch_id: currentBatch.id,
      slot_id: selectedSlot.id,
      facility_id: selectedSlot.facility_id,
      payload: { reason },
    });

    const updatedSlots = slots.map(s => {
      if (s.id === selectedSlot.id) {
        return { ...s, status: 'skipped' as const, actual_time: Date.now(), notes: reason };
      }
      if (s.status === 'pending' && s.sequence === selectedSlot.sequence + 1) {
        return { ...s, status: 'active' as const };
      }
      return s;
    });

    setSlots(updatedSlots);
    triggerSync();

    toast.warning('Delivery skipped', {
      description: `${selectedFacility?.name} marked as skipped`,
    });
  }, [selectedSlot, driver, currentBatch, slots, setSlots, triggerSync, selectedFacility]);

  const handleLogout = useCallback(async () => {
    await logout();
    localStorage.removeItem('mod4-auth');
    navigate('/login');
  }, [logout, navigate]);

  // ============================
  // RENDER
  // ============================

  return (
    <AppShell title="Dashboard">
      <div className="p-4 space-y-5 pb-6">

        {/* ── Driver Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-bold text-lg">
              {driver?.name?.charAt(0)?.toUpperCase() || 'D'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight">
                {driver?.name || 'Driver'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {driver?.email}
              </p>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              isOnline
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </motion.div>

        {/* ── Sync Status Bar ── */}
        {(pendingCount > 0 || errorCount > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium",
              errorCount > 0
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
            )}
          >
            <span>
              {errorCount > 0
                ? `${errorCount} event(s) failed to sync`
                : `${pendingCount} event(s) pending sync`}
            </span>
            <button onClick={triggerSync} className="underline">
              Retry
            </button>
          </motion.div>
        )}

        {/* ── No Batch Assigned (Empty State) ── */}
        {!currentBatch && !isFetchingBatch && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
              <Truck className="w-10 h-10 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-foreground">No Active Batch</h3>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                You don't have a delivery batch assigned yet. Your dispatcher will assign one when it's time.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActiveBatch}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check for Batches
            </Button>
          </motion.div>
        )}

        {/* ── Loading State ── */}
        {isFetchingBatch && !currentBatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 space-y-3"
          >
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your batch...</p>
          </motion.div>
        )}

        {/* ── Active Batch Content ── */}
        {currentBatch && (
          <>
            {/* Batch overview card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl bg-card border border-border/60 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">
                    Batch #{currentBatch.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  currentBatch.status === 'active'
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                )}>
                  {currentBatch.status === 'active' ? 'In Progress' : 'Assigned'}
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <StatBlock
                  label="Total"
                  value={slots.length}
                  icon={<Package className="w-3.5 h-3.5" />}
                />
                <StatBlock
                  label="Done"
                  value={completedSlots.length}
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                />
                <StatBlock
                  label="Remaining"
                  value={pendingSlots.length + (activeSlot ? 1 : 0)}
                  icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
                />
              </div>

              {/* Progress bar */}
              {slots.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{completedSlots.length} of {slots.length} delivered</span>
                    <span className="font-mono">{Math.round((completedSlots.length / slots.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedSlots.length / slots.length) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </motion.div>

            {/* Active delivery card */}
            {activeSlot && (
              <ActiveDeliveryCard
                slot={activeSlot}
                facility={facilities.find(f => f.id === activeSlot.facility_id)!}
                onDeliver={handleOpenDelivery}
              />
            )}

            {/* Upcoming stops */}
            {pendingSlots.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Upcoming ({pendingSlots.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-7"
                    onClick={() => navigate('/route')}
                  >
                    <Route className="w-3.5 h-3.5" />
                    View Route
                  </Button>
                </div>
                <div className="space-y-2">
                  {pendingSlots.slice(0, 3).map((slot, index) => (
                    <SlotCard
                      key={slot.id}
                      slot={slot}
                      facility={facilities.find(f => f.id === slot.facility_id)!}
                      index={index}
                      onClick={() => handleSlotSelect(slot)}
                    />
                  ))}
                  {pendingSlots.length > 3 && (
                    <button
                      onClick={() => navigate('/route')}
                      className="w-full py-2 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      +{pendingSlots.length - 3} more stops
                    </button>
                  )}
                </div>
              </motion.section>
            )}

            {/* Completed summary */}
            {completedSlots.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  className="w-full p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                  onClick={() => navigate('/summary')}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="flex-1 text-left">
                      <p className="text-sm text-foreground font-medium">
                        {completedSlots.length} {completedSlots.length === 1 ? 'delivery' : 'deliveries'} completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tap to view shift summary
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              </motion.section>
            )}

            {/* All done state */}
            {slots.length > 0 && pendingSlots.length === 0 && !activeSlot && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-8 space-y-3"
              >
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">All Deliveries Complete</h3>
                <p className="text-sm text-muted-foreground text-center max-w-[260px]">
                  You've finished all {slots.length} stops in this batch. Great work!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/summary')}
                  className="gap-2"
                >
                  View Shift Summary
                </Button>
              </motion.div>
            )}
          </>
        )}

        {/* ── Quick Actions ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="pt-2"
        >
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={<MapPin className="w-5 h-5" />}
              label="Route Map"
              onClick={() => navigate('/route')}
            />
            <QuickAction
              icon={<AlertCircle className="w-5 h-5" />}
              label="Support"
              onClick={() => navigate('/support')}
            />
            <QuickAction
              icon={<RefreshCw className="w-5 h-5" />}
              label="Refresh"
              onClick={fetchActiveBatch}
            />
            <QuickAction
              icon={<LogOut className="w-5 h-5" />}
              label="Sign Out"
              onClick={handleLogout}
              variant="muted"
            />
          </div>
        </motion.div>
      </div>

      {/* Delivery action sheet */}
      <DeliverySheet
        open={deliverySheetOpen}
        onOpenChange={setDeliverySheetOpen}
        slot={selectedSlot}
        facility={selectedFacility}
        onConfirmDelivery={handleConfirmDelivery}
        onSkipDelivery={handleSkipDelivery}
      />
    </AppShell>
  );
}

// =============================================
// SUB-COMPONENTS
// =============================================

function StatBlock({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 py-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold text-foreground">{value}</span>
    </div>
  );
}

function QuickAction({ icon, label, onClick, variant = 'default' }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'muted';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-colors text-left",
        variant === 'default'
          ? "bg-card border-border/60 hover:border-primary/40 hover:bg-primary/5"
          : "bg-muted/30 border-border/40 hover:bg-muted/60 text-muted-foreground"
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function ActiveDeliveryCard({
  slot,
  facility,
  onDeliver
}: {
  slot: Slot;
  facility: Facility;
  onDeliver: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-transparent border border-amber-500/30"
    >
      {/* Pulse indicator */}
      <div className="absolute top-4 right-4">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30">
            <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider mb-1">
              Current Stop #{slot.sequence}
            </p>
            <h3 className="text-lg font-bold text-foreground leading-tight">
              {facility?.name || 'Unknown Facility'}
            </h3>
          </div>
        </div>

        {facility?.address && (
          <div className="flex items-start gap-2 mb-3 text-muted-foreground">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{facility.address}</p>
          </div>
        )}

        {facility?.contact_name && (
          <div className="flex items-center gap-2 mb-4 text-muted-foreground">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm">
              {facility.contact_name}{facility.contact_phone ? ` \u2022 ${facility.contact_phone}` : ''}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold"
          >
            <Navigation className="w-4 h-4 mr-2" />
            Navigate
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-amber-500/30 text-foreground hover:bg-amber-500/10 font-semibold"
            onClick={onDeliver}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Deliver
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SlotCard({
  slot,
  facility,
  index,
  onClick
}: {
  slot: Slot;
  facility: Facility;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-left"
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
        <CircleDot className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">
          {facility?.name || 'Unknown'}
        </h4>
        <p className="text-xs text-muted-foreground truncate">
          {facility?.address || ''}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground">
          #{slot.sequence}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.button>
  );
}
