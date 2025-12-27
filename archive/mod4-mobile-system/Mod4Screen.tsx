import React, { useState, useEffect } from 'react';
import { useMod4Service } from './useMod4Service';
import { useGeoLocation } from './useGeoLocation';
import { finalizeDelivery } from './DeliveryLogic';
import { DeliveryItem, ProofOfDelivery, GeoLocation } from './events';
import './Mod4Screen.css';

// Mock Data for demonstration (In real app, this comes from /cat4 or /log4)
const MOCK_TRIP = {
  tripId: 'trip_123',
  dispatchId: 'disp_456',
  destination: { lat: 40.7128, lng: -74.0060 }, // NYC
  items: [
    { item_id: 'sku_A', expected_qty: 10, delivered_qty: 10 },
    { item_id: 'sku_B', expected_qty: 5, delivered_qty: 5 },
  ] as DeliveryItem[]
};

export const Mod4Screen: React.FC = () => {
  // 1. Setup Service Stack
  const [driverId, setDriverId] = useState('driver_001');
  const [pin, setPin] = useState('1234'); // Secret for encryption
  const { eventService, authService, isReady, error } = useMod4Service(
    driverId,
    'device_current',
    'vehicle_101',
    'https://api.biko.com/mod4',
    pin
  );

  // 3. GeoLocation Hook
  const { getCurrentPosition, error: geoError, loading: geoLoading } = useGeoLocation();

  // 2. UI State
  const [view, setView] = useState<'login' | 'dashboard' | 'delivery'>('login');
  const [items, setItems] = useState<DeliveryItem[]>(MOCK_TRIP.items);
  const [recipientName, setRecipientName] = useState('');
  const [signature, setSignature] = useState(''); // Simplified text for demo
  const [proxyReason, setProxyReason] = useState('');
  const [showProxyPrompt, setShowProxyPrompt] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleLogin = async () => {
    if (!isReady || !authService) return;
    try {
      const geo = await getCurrentPosition();
      await authService.login(driverId, geo);
      setView('dashboard');
    } catch (e) {
      setStatusMsg('Login failed');
    }
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].delivered_qty = qty;
    setItems(newItems);
  };

  const handleReasonChange = (index: number, reason: string) => {
    const newItems = [...items];
    newItems[index].discrepancy_reason = reason;
    setItems(newItems);
  };

  const attemptFinalize = async (forceProxyReason?: string) => {
    if (!eventService) return;
    setStatusMsg('Finalizing...');

    try {
      const currentGeo = await getCurrentPosition();
      
      const pod: ProofOfDelivery = {
        recipient_name: recipientName,
        recipient_role: 'Manager',
        signature_data: signature
      };

      // Call Domain Logic
      await finalizeDelivery(
        eventService,
        MOCK_TRIP.tripId,
        MOCK_TRIP.dispatchId,
        currentGeo,
        MOCK_TRIP.destination,
        items,
        pod,
        100, // 100m radius
        forceProxyReason
      );

      setStatusMsg('Delivery Completed Successfully!');
      setTimeout(() => setView('dashboard'), 2000);
      setShowProxyPrompt(false);
      setProxyReason('');

    } catch (err: any) {
      if (err.message.includes('PROXY_DELIVERY_DETECTED')) {
        setShowProxyPrompt(true);
        setStatusMsg('Warning: You are away from the destination.');
      } else {
        setStatusMsg(`Error: ${err.message}`);
      }
    }
  };

  if (error) return <div className="p-4 text-red-500">System Error: {error.message}</div>;

  // --- VIEW: LOGIN ---
  if (view === 'login') {
    return (
      <div className="mod4-container">
        <div className="mod4-card" style={{ marginTop: '2rem' }}>
          <h1 className="mod4-title">mod4 Driver Login</h1>
          <div className="mod4-form-group">
            <label className="mod4-label">Driver ID</label>
            <input 
              className="mod4-input"
              value={driverId} 
              onChange={e => setDriverId(e.target.value)} 
            />
          </div>
          <div className="mod4-form-group">
            <label className="mod4-label">PIN (Encryption Key)</label>
            <input 
              type="password"
              className="mod4-input"
              value={pin} 
              onChange={e => setPin(e.target.value)} 
            />
          </div>
          <button 
            onClick={handleLogin}
            disabled={!isReady}
            className="mod4-button mod4-btn-primary"
          >
            {isReady ? 'Unlock Session' : 'Initializing...'}
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: DASHBOARD ---
  if (view === 'dashboard') {
    return (
      <div className="mod4-container">
        <header className="mod4-header">
          <h1 className="mod4-title" style={{ marginBottom: 0 }}>My Trips</h1>
          <button onClick={() => eventService?.forceSync()} className="mod4-button mod4-btn-link">
            Sync Now
          </button>
        </header>
        
        <div className="mod4-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold' }}>Trip #{MOCK_TRIP.tripId}</span>
            <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>Active</span>
          </div>
          <p className="mod4-label">Destination: NYC Hub</p>
          <button 
            onClick={() => setView('delivery')}
            className="mod4-button mod4-btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Execute Delivery
          </button>
        </div>
        {statusMsg && <div className="mod4-status-msg mod4-status-success">{statusMsg}</div>}
      </div>
    );
  }

  // --- VIEW: DELIVERY EXECUTION ---
  return (
    <div className="mod4-container">
      <h2 className="mod4-title">Complete Delivery</h2>
      
      {/* Section 7.1: Reconciliation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="mod4-subtitle">1. Reconcile Items</h3>
        {items.map((item, idx) => (
          <div key={item.item_id} className="mod4-item-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontWeight: 500 }}>{item.item_id}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Exp: {item.expected_qty}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label className="mod4-label" style={{ marginBottom: 0 }}>Delivered:</label>
              <input 
                type="number" 
                className="mod4-input"
                style={{ width: '80px', padding: '0.5rem', marginBottom: 0 }}
                value={item.delivered_qty}
                onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value))}
              />
            </div>
            {item.delivered_qty !== item.expected_qty && (
              <input 
                placeholder="Reason for discrepancy (Required)"
                className="mod4-input"
                style={{ marginTop: '0.5rem', borderColor: 'var(--danger-color)', marginBottom: 0 }}
                value={item.discrepancy_reason || ''}
                onChange={(e) => handleReasonChange(idx, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Section 7.2: PoD */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 className="mod4-subtitle">2. Proof of Delivery</h3>
        <input 
          placeholder="Recipient Name"
          className="mod4-input"
          style={{ marginBottom: '0.5rem' }}
          value={recipientName}
          onChange={e => setRecipientName(e.target.value)}
        />
        <input 
          placeholder="Sign Here (Text for Demo)"
          className="mod4-input"
          style={{ backgroundColor: '#f3f4f6' }}
          value={signature}
          onChange={e => setSignature(e.target.value)}
        />
      </div>

      {/* Action & Status */}
      <div style={{ marginTop: '1.5rem' }}>
        {geoError && (
          <div className="mod4-status-msg mod4-status-error" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', marginBottom: '1rem' }}>
            GPS Error: {geoError} (Using Fallback)
          </div>
        )}
        {statusMsg && (
          <div className={`mod4-status-msg ${statusMsg.includes('Error') ? 'mod4-status-error' : 'mod4-status-success'}`} style={{ backgroundColor: statusMsg.includes('Error') ? '#fee2e2' : '#dcfce7', color: statusMsg.includes('Error') ? '#b91c1c' : '#15803d', marginBottom: '1rem' }}>
            {statusMsg}
          </div>
        )}
        
        <button 
          onClick={() => attemptFinalize()}
          disabled={geoLoading}
          className="mod4-button mod4-btn-success"
        >
          {geoLoading ? 'Acquiring GPS...' : 'Finalize Delivery'}
        </button>
      </div>

      {/* Section 8.2: Proxy Delivery Modal */}
      {showProxyPrompt && (
        <div className="mod4-modal-overlay">
          <div className="mod4-modal-content">
            <h3 className="mod4-subtitle" style={{ color: 'var(--danger-color)' }}>Location Warning</h3>
            <p className="mod4-label" style={{ marginBottom: '1rem', fontWeight: 400 }}>
              You are finalizing this delivery far from the expected location. Please provide a justification.
            </p>
            <textarea 
              className="mod4-textarea"
              placeholder="e.g. Loading dock blocked, delivered to front desk..."
              value={proxyReason}
              onChange={e => setProxyReason(e.target.value)}
            />
            <button 
              onClick={() => attemptFinalize(proxyReason)}
              disabled={!proxyReason}
              className="mod4-button mod4-btn-danger"
            >
              Confirm Proxy Delivery
            </button>
            <button 
              onClick={() => setShowProxyPrompt(false)}
              className="mod4-button mod4-btn-secondary"
              style={{ marginTop: '0.5rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};