// CivicMap — Interactive Leaflet map showing task pins (color-coded by status) + worker locations

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Database } from '@/integrations/supabase/types';

type Task    = Database['public']['Tables']['tasks']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface CivicMapProps {
  tasks: Task[];
  workers?: Profile[];
  className?: string;
}

// Status → marker colour mapping
const STATUS_COLORS: Record<string, string> = {
  pending:     '#F59E0B',  // amber  – needs assignment
  assigned:    '#3B82F6',  // blue   – waiting for worker
  in_progress: '#8B5CF6',  // purple – worker on it
  completed:   '#10B981',  // green  – done
  cancelled:   '#6B7280',  // grey   – cancelled
};

const PRIORITY_RING: Record<string, string> = {
  critical: '#EF4444',
  high:     '#F97316',
  medium:   '#F59E0B',
  low:      '#6B7280',
};

/** Build an SVG circle marker with inner dot + optional ring */
function makeTaskIcon(status: string, priority: string): L.DivIcon {
  const fill   = STATUS_COLORS[status] ?? '#6B7280';
  const ring   = PRIORITY_RING[priority] ?? '#6B7280';
  const isCrit = priority === 'critical' || priority === 'high';

  const svg = `
    <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      ${isCrit ? `<circle cx="14" cy="14" r="13" fill="none" stroke="${ring}" stroke-width="2" opacity="0.6"/>` : ''}
      <circle cx="14" cy="14" r="9" fill="${fill}" opacity="0.9"/>
      <circle cx="14" cy="14" r="4" fill="white" opacity="0.9"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
    popupAnchor:[0, -14],
  });
}

/** Worker location marker — small teal diamond */
function makeWorkerIcon(): L.DivIcon {
  const svg = `
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,2 20,11 11,20 2,11" fill="#0EA5E9" opacity="0.9"/>
      <polygon points="11,6 16,11 11,16 6,11" fill="white" opacity="0.85"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize:   [22, 22],
    iconAnchor: [11, 11],
    popupAnchor:[0, -11],
  });
}

export function CivicMap({ tasks, workers = [], className = '' }: CivicMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const layerRef     = useRef<L.LayerGroup | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 0],
      zoom: 2,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark tile layer (Carto Dark Matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', maxZoom: 19 }
    ).addTo(map);

    // Attribution (tiny)
    L.control.attribution({ prefix: false })
      .addAttribution('© <a href="https://carto.com/" style="color:#64748b">CARTO</a>')
      .addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current   = map;

    return () => {
      map.remove();
      mapRef.current  = null;
      layerRef.current = null;
    };
  }, []);

  // Update markers whenever data changes
  useEffect(() => {
    const map   = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    const bounds: [number, number][] = [];

    // Task pins
    tasks.forEach(task => {
      const lat = task.latitude;
      const lon = task.longitude;
      if (!lat && !lon) return; // skip zero-zero (default)
      if (lat === 0 && lon === 0) return;

      bounds.push([lat, lon]);

      const marker = L.marker([lat, lon], {
        icon: makeTaskIcon(task.status, task.priority),
      });

      const statusColor = STATUS_COLORS[task.status] ?? '#6B7280';
      marker.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:180px;background:#1e293b;color:#f1f5f9;border-radius:8px;padding:12px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#f1f5f9">${task.title}</div>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;border-radius:4px;padding:2px 7px;font-size:11px;text-transform:capitalize">${task.status.replace('_',' ')}</span>
            <span style="color:#94a3b8;font-size:11px;text-transform:capitalize">${task.priority}</span>
          </div>
          ${task.location_name ? `<div style="color:#64748b;font-size:11px">📍 ${task.location_name}</div>` : ''}
          ${task.category ? `<div style="color:#64748b;font-size:11px;margin-top:2px">🏷 ${task.category}</div>` : ''}
        </div>
      `, { className: 'civic-popup' });

      layer.addLayer(marker);
    });

    // Worker pins
    workers.forEach(worker => {
      if (!worker.latitude || !worker.longitude) return;
      if (worker.latitude === 0 && worker.longitude === 0) return;

      bounds.push([worker.latitude, worker.longitude]);

      const marker = L.marker([worker.latitude, worker.longitude], {
        icon: makeWorkerIcon(),
      });

      marker.bindPopup(`
        <div style="font-family:'DM Sans',sans-serif;min-width:160px;background:#1e293b;color:#f1f5f9;border-radius:8px;padding:12px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;color:#f1f5f9">${worker.full_name}</div>
          <div style="color:#0EA5E9;font-size:12px;margin-bottom:4px">Worker</div>
          <div style="display:flex;justify-content:space-between;color:#94a3b8;font-size:11px">
            <span>Score</span>
            <span style="color:#f1f5f9;font-weight:600">${(worker.performance_score ?? 7.5).toFixed(1)}/10</span>
          </div>
          ${worker.region ? `<div style="color:#64748b;font-size:11px;margin-top:4px">📍 ${worker.region}</div>` : ''}
        </div>
      `, { className: 'civic-popup' });

      layer.addLayer(marker);
    });

    // Fit bounds if we have markers
    if (bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 12);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
      }
    }
  }, [tasks, workers]);

  return (
    <>
      {/* Inject popup styles globally once */}
      <style>{`
        .civic-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
          border-radius: 8px !important;
          padding: 0 !important;
        }
        .civic-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .civic-popup .leaflet-popup-tip {
          background: #1e293b !important;
        }
        .leaflet-control-zoom {
          border: 1px solid hsl(220 18% 22%) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: hsl(220 18% 14%) !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid hsl(220 18% 22%) !important;
        }
        .leaflet-control-zoom a:hover {
          background: hsl(220 18% 20%) !important;
          color: #f1f5f9 !important;
        }
      `}</style>
      <div ref={containerRef} className={className} style={{ zIndex: 0 }} />
    </>
  );
}
