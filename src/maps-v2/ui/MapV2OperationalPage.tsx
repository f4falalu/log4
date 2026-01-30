import { useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import MapV2DemoPage from './MapV2DemoPage';

export default function MapV2OperationalPage() {
  const setMode = useMapStore((s) => s.setMode);

  useEffect(() => {
    setMode('operational');
  }, [setMode]);

  return <MapV2DemoPage />;
}
