import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../store/useAppStore';

export const CampusMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const popupRef = useRef<any>(null);

  const { stops, routes, isDark, setSelectedStop, flags } = useAppStore();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Keyless OpenStreetMap tiles with dark fallback and dark mode raster filters
    const style = {
      version: 8 as const,
      sources: {
        'osm-tiles': {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
          maxzoom: 19,
        },
      },
      layers: [
        {
          id: 'background-fallback',
          type: 'background' as const,
          paint: {
            'background-color': isDark ? '#090D16' : '#F3F4F6',
          },
        },
        {
          id: 'osm-raster-layer',
          type: 'raster' as const,
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19,
          paint: isDark
            ? {
                'raster-brightness-max': 0.45,
                'raster-saturation': -0.6,
                'raster-contrast': 0.1,
              }
            : {},
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

    map.on('error', () => {});
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

  // Update Stop Markers with live crowding indicators & hover popup
  useEffect(() => {
    const map = mapRef.current;
    if (!map || stops.length === 0) return;

    // Check which stops have active overcrowding flags
    const criticalStops = new Set(
      flags.filter((f) => f.type === 'capacity_violation').map((f) => f.stop_id)
    );
    const warningStops = new Set(
      flags.filter((f) => f.type === 'overcrowding').map((f) => f.stop_id)
    );

    stops.forEach((stop) => {
      const isCritical = criticalStops.has(stop.stop_id);
      const isWarning = warningStops.has(stop.stop_id);
      const crowdingText = isCritical
        ? 'Too full (over capacity)'
        : isWarning
        ? 'Getting full'
        : 'Comfortable';

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

        // Hover tooltip showing stop name and current crowding in plain words
        el.addEventListener('mouseenter', () => {
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            className: 'campus-stop-popup',
          })
            .setLngLat([stop.lon, stop.lat])
            .setHTML(
              `<div style="background:#111827; color:#F9FAFB; padding:6px 10px; border-radius:6px; font-size:11px; border:1px solid #374151; font-family:sans-serif; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
                <strong>${stop.stop_name}</strong>
                <div style="color:${isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#10B981'}; font-weight:600; margin-top:2px;">
                  Status: ${crowdingText}
                </div>
              </div>`
            )
            .addTo(map);
        });

        el.addEventListener('mouseleave', () => {
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
        });

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([stop.lon, stop.lat])
          .addTo(map);

        markersRef.current[stop.stop_id] = marker;
      }

      // Update styling based on crowding
      const el = marker.getElement();
      if (isCritical) {
        el.style.backgroundColor = 'var(--semantic-red)';
        el.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.9)';
      } else if (isWarning) {
        el.style.backgroundColor = 'var(--semantic-amber)';
        el.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.7)';
      } else {
        el.style.backgroundColor = 'var(--semantic-green)';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
      }
    });
  }, [stops, flags, setSelectedStop]);

  return (
    <div
      style={{ backgroundColor: isDark ? '#090D16' : '#F3F4F6' }}
      className="absolute inset-0 w-full h-full tour-map-canvas"
    >
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
