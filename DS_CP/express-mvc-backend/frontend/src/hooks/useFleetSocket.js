import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useFleetSocket(wsUrl, onVehicleUpdate, onStatusChange) {
  useEffect(() => {
    const socket = io(wsUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      onStatusChange?.('connected');
    });

    socket.on('disconnect', () => {
      onStatusChange?.('disconnected');
    });

    socket.on('connect_error', () => {
      onStatusChange?.('degraded');
    });

    socket.on('fleet:location-updated', (payload) => {
      onVehicleUpdate?.(payload);
    });

    socket.on('fleet:location-batch', (payload) => {
      const updates = payload?.updates;
      if (!Array.isArray(updates)) return;
      for (const update of updates) {
        onVehicleUpdate?.(update);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [wsUrl, onVehicleUpdate, onStatusChange]);
}
