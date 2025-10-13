import { useState, useEffect } from 'react';

export function useDriverFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => {
    const stored = localStorage.getItem('driver-favorites');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('driver-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (driverId: string) => {
    setFavorites(prev => 
      prev.includes(driverId)
        ? prev.filter(id => id !== driverId)
        : [...prev, driverId]
    );
  };

  const isFavorite = (driverId: string) => favorites.includes(driverId);

  return { favorites, toggleFavorite, isFavorite };
}
