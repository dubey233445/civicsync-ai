// LocationPicker — click-to-place Leaflet map component
// Returns { lat, lng } whenever user clicks the map

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationPickerProps {
  lat?: number;
  lng?: number;
  onChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

/** Crosshair pin for the selected location */
function makePinIcon(): L.DivIcon {
  const svg = `
    <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-30%" y="-10%" width="160%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
      </filter>
      <g filter="url(#shadow)">
        <path d="M16 2C9.37 2 4 7.37 4 14c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z"
              fill="hsl(211 100% 50%)" stroke="white" stroke-width="1.5"/>
        <circle cx="16" cy="14" r="5" fill="white" opacity="0.9"/>
      </g>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [32, 40],
    iconAnchor: [16, 40],
    popupAnchor:[0, -40],
  });
}

export function LocationPicker({ lat, lng, onChange, className = '' }: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);

  // Stable callback ref so the click handler doesn't stale-close
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initLat = lat ?? 20;
    const initLng = lng ?? 0;
    const initZoom = lat ? 12 : 2;

    const map = L.map(containerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    // Crosshair cursor on map
    map.getContainer().style.cursor = 'crosshair';

    // If initial coords exist, place marker
    if (lat && lng) {
      const marker = L.marker([lat, lng], { icon: makePinIcon(), draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });
      markerRef.current = marker;
    }

    // Click handler
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], { icon: makePinIcon(), draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onChangeRef.current({ lat: pos.lat, lng: pos.lng });
        });
        markerRef.current = marker;
      }

      onChangeRef.current({ lat: clickLat, lng: clickLng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current  = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes (e.g. typed input)
  useEffect(() => {
    if (!mapRef.current || lat === undefined || lng === undefined) return;
    if (isNaN(lat) || isNaN(lng)) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], { icon: makePinIcon(), draggable: true }).addTo(mapRef.current);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChangeRef.current({ lat: pos.lat, lng: pos.lng });
      });
      markerRef.current = marker;
    }

    mapRef.current.setView([lat, lng], Math.max(mapRef.current.getZoom(), 11));
  }, [lat, lng]);

  return (
    <>
      <style>{`
        .location-picker-map .leaflet-control-zoom {
          border: 1px solid hsl(220 18% 22%) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .location-picker-map .leaflet-control-zoom a {
          background: hsl(220 18% 14%) !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid hsl(220 18% 22%) !important;
        }
        .location-picker-map .leaflet-control-zoom a:hover {
          background: hsl(220 18% 20%) !important;
          color: #f1f5f9 !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className={`location-picker-map ${className}`}
        style={{ zIndex: 0 }}
      />
    </>
  );
}
