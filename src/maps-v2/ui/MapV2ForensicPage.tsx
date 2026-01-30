import { useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import MapV2DemoPage from './MapV2DemoPage';

export default function MapV2ForensicPage() {
  const setMode = useMapStore((s) => s.setMode);

  useEffect(() => {
    setMode('forensic');
  }, [setMode]);

  return <MapV2DemoPage />;
}
