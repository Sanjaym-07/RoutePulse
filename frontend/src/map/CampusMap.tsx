import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/useAppStore';

export const CampusMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const { stops, routes, simTimeSeconds, isDark, setSelectedStop, flags } = useAppStore();

  // Helper to format scrubber seconds into HH:MM
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Use CARTO raster tiles for high-contrast dark/light operations aesthetic
    const style = isDark
      ? {
          version: 8 as const,
          sources: {
            'carto-dark': {
              type: 'raster' as const,
              tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
              tileSize: 256,
              attribution: '© CARTO, OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'carto-dark-layer',
              type: 'raster' as const,
              source: 'carto-dark',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        }
      : {
          version: 8 as const,
          sources: {
            'carto-light': {
              type: 'raster' as const,
              tiles: ['https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'],
              tileSize: 256,
              attribution: '© CARTO, OpenStreetMap contributors',
            },
          },
          layers: [
            {
              id: 'carto-light-layer',
              type: 'raster' as const,
              source: 'carto-light',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: style,
      center: [-122.1700, 37.4285], // Stanford-style campus center
      zoom: 14.5,
      pitch: 25,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
    };
  }, [isDark]);

  // Draw routes once map is ready and routes loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || routes.length === 0 || stops.length === 0) return;

    const stopMap = new Map(stops.map((s) => [s.stop_id, [s.lon, s.lat]]));

    const drawLines = () => {
      routes.forEach((route) => {
        const sourceId = `route-source-${route.route_id}`;
        const layerId = `route-layer-${route.route_id}`;

        const coords = route.stops
          .map((rs) => stopMap.get(rs.stop_id))
          .filter(Boolean) as [number, number][];

        if (coords.length < 2) return;

        const geojson: any = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { color: route.color },
              geometry: {
                type: 'LineString',
                coordinates: coords,
              },
            },
          ],
        };

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as any).setData(geojson);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data: geojson,
          });

          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: {
              'line-join': 'round',
              'line-cap': 'round',
            },
            paint: {
              'line-color': route.color,
              'line-width': 4.5,
              'line-opacity': 0.85,
            },
          });
        }
      });
    };

    if (map.isStyleLoaded()) {
      drawLines();
    } else {
      map.on('load', drawLines);
    }
  }, [routes, stops]);

  // Update Stop Markers with live crowding indicators
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stops.length === 0) return;

    // Check which stops have active overcrowding flags
    const activeCrowdedStops = new Set(
      flags
        .filter((f) => f.type === 'overcrowding' || f.type === 'capacity_violation')
        .map((f) => f.stop_id)
    );

    stops.forEach((stop) => {
      const isCrowded = activeCrowdedStops.has(stop.stop_id);
      let marker = markersRef.current[stop.stop_id];

      if (!marker) {
        const el = document.createElement('div');
        el.className = 'campus-stop-marker';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '2.5px solid #FFFFFF';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
        el.style.transition = 'all 0.25s ease';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';

        el.addEventListener('click', () => {
          setSelectedStop(stop);
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lon, stop.lat])
          .addTo(map);

        markersRef.current[stop.stop_id] = marker;
      }

      // Update styling based on crowding
      const el = marker.getElement();
      if (isCrowded) {
        el.style.backgroundColor = 'var(--semantic-red)';
        el.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.8)';
      } else {
        el.style.backgroundColor = 'var(--semantic-blue)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }
    });
  }, [stops, flags, setSelectedStop]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
