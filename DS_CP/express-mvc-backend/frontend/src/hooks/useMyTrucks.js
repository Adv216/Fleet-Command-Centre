import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export function useMyTrucks(wsUrl) {
  const trucksRef = useRef(new Map());
  const [trucks, setTrucks] = useState([]);

  const flush = useCallback(() => setTrucks([...trucksRef.current.values()]), []);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket'], reconnection: true, reconnectionDelay: 500 });

    socket.on('myTruck:update', (payload) => {
      if (!payload?.truckId) return;
      trucksRef.current.set(payload.truckId, payload);
      flush();
    });

    socket.on('myTruck:stopped', ({ truckId }) => {
      trucksRef.current.delete(truckId);
      flush();
    });

    return () => socket.disconnect();
  }, [wsUrl, flush]);

  return trucks;
}