import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface BottomMapPanelProps {
  onAddMapCard: (lat: number, lng: number, address: string) => void;
}

export default function BottomMapPanel({ onAddMapCard }: BottomMapPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Map 3D buildings and Zoom states
  const [zoom, setZoom] = useState(4);
  const [is3DEnabled, setIs3DEnabled] = useState(true);

  // Map context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);

  const mapContainerId = 'global-sliding-map-container';
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  // Handle map opening/closing state
  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      return;
    }

    // Initialize map when opened
    const timer = setTimeout(() => {
      const container = document.getElementById(mapContainerId);
      if (!container) return;

      const map = new maplibregl.Map({
        container: mapContainerId,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [29.0949765, 37.7456585],
        zoom: 4,
        pitch: 0,
        bearing: 0,
        attributionControl: false
      });

      mapRef.current = map;
      setZoom(map.getZoom());

      // Sync zoom context
      map.on('zoomend', () => {
        setZoom(map.getZoom());
      });

      // Simple click handler to hide context menu
      map.on('click', () => {
        setContextMenu(null);
      });

      // Capturing Right-Click (contextmenu) event
      map.on('contextmenu', (e) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        
        const originalEvent = e.originalEvent;
        originalEvent.preventDefault();

        // Calculate screen positions relative to the container for stable overlay positioning
        const containerRect = container.getBoundingClientRect();
        setContextMenu({
          x: originalEvent.clientX - containerRect.left,
          y: originalEvent.clientY - containerRect.top,
          lat,
          lng
        });
      });

      // Add 3D extrusion layer if 3D is enabled
      map.on('style.load', () => {
        if (is3DEnabled) {
          add3DBuildingsLayer(map);
        }
      });

      // Trigger redraw sizing on next frames
      setTimeout(() => {
        map.resize();
      }, 100);

    }, 300);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, [isOpen]);

  // Handle 3D Buildings setup
  const add3DBuildingsLayer = (map: maplibregl.Map) => {
    if (!map.isStyleLoaded()) return;
    if (map.getLayer('3d-buildings')) return;

    const layers = map.getStyle().layers || [];
    let labelLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].type === 'symbol' && layers[i].layout && (layers[i].layout as any)['text-field']) {
        labelLayerId = layers[i].id;
        break;
      }
    }

    // Modern WebGL Layer to extrude worldwide OpenStreetMap buildings
    map.addLayer(
      {
        id: '3d-buildings',
        source: 'openmaptiles',
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': 'rgba(56, 189, 248, 0.35)', // Sleek holographic sky color borders
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.05,
            ['get', 'render_height']
          ],
          'fill-extrusion-base': [
            'interpolate',
            ['linear'],
            ['zoom'],
            14,
            0,
            14.05,
            ['get', 'render_min_height']
          ],
          'fill-extrusion-opacity': 0.85
        }
      },
      labelLayerId
    );
  };

  // Sync 3D toggled switches dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (is3DEnabled) {
      if (!map.getLayer('3d-buildings')) {
        add3DBuildingsLayer(map);
      } else {
        map.setLayoutProperty('3d-buildings', 'visibility', 'visible');
      }
      // Pitch/Tilt the camera and zoom in to get beautiful 3D view perspective
      map.easeTo({
        pitch: 55,
        bearing: -10,
        duration: 800
      });
      if (map.getZoom() < 14) {
        map.setZoom(15.5);
      }
    } else {
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', 'none');
      }
      map.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 800
      });
    }
  }, [is3DEnabled]);

  // Handle outside click to hide context menu
  useEffect(() => {
    const handleOutsideClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    setSearchError(null);
    setContextMenu(null);

    const map = mapRef.current;

    try {
      // 1. Check if query contains raw latitude, longitude
      const coordsRegex = /^[-+]?([1-9]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
      if (coordsRegex.test(searchQuery.trim())) {
        const [latStr, lngStr] = searchQuery.split(',');
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          map.flyTo({ center: [lng, lat], zoom: 16, pitch: is3DEnabled ? 55 : 0 });
          
          // Add marker
          updateMarker(lat, lng);
          setIsSearching(false);
          return;
        }
      }

      // 2. Query OSM Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Accept-Language': 'ru,en'
          }
        }
      );
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        map.flyTo({ center: [lon, lat], zoom: 16, pitch: is3DEnabled ? 55 : 0 });

        updateMarker(lat, lon);
      } else {
        setSearchError('Адрес не найден.');
      }
    } catch (err) {
      setSearchError('Ошибка поиска.');
    } finally {
      setIsSearching(false);
    }
  };

  const updateMarker = (lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translateY(-40%); pointer-events: none;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="28px" height="28px" style="filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    }
  };

  // Create card from right clicked coordinates
  const handleCreateCardFromContext = async () => {
    if (!contextMenu) return;
    const { lat, lng } = contextMenu;
    setContextMenu(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'ru,en'
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        onAddMapCard(lat, lng, address);
      } else {
        onAddMapCard(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      onAddMapCard(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  };

  return (
    <div 
      className={`absolute bottom-0 left-0 w-full bg-[#09090b] border-t border-zinc-850 z-[99] flex flex-col transition-all duration-300 ${
        isOpen 
          ? 'h-[320px] shadow-2xl glow-indigo-strong opacity-100' 
          : 'h-0 opacity-100'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Minimalistic выдвижная стрелочка toggle button matching standard menus */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-1/2 -translate-x-1/2 -top-4 w-12 h-4 bg-zinc-950 border border-zinc-800 border-b-0 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 flex items-center justify-center cursor-pointer z-[100] transition-colors shadow-lg font-mono text-[9px] select-none rounded-t-sm pointer-events-auto"
        title={isOpen ? 'Свернуть карту' : 'Открыть карту'}
      >
        {isOpen ? '▼' : '▲'}
      </button>

      {/* Slide visibility wrapper */}
      <div className={`flex-1 min-h-0 relative w-full h-full transition-opacity duration-200 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* MAP CANVAS DIV */}
        <div id={mapContainerId} className="w-full h-full text-zinc-900 z-10" />

        {/* DYNAMIC SEARCH BOX OVERLAY */}
        <div 
          className="absolute top-2.5 left-2.5 p-1.5 bg-zinc-950/95 rounded-none border border-zinc-850 shadow-md flex flex-col space-y-1 w-[160px] z-[1000] glow-indigo"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex space-x-1">
            <input
              type="text"
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-none px-1.5 py-0.5 text-[10px] text-zinc-150 outline-none placeholder-zinc-500 font-sans"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
            <button
              onClick={handleSearch}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold text-[9px] px-1.5 rounded-none cursor-pointer transition-colors"
              disabled={isSearching}
            >
              {isSearching ? '...' : 'Ок'}
            </button>
          </div>
          {searchError && (
            <span className="text-[8px] text-red-400 font-mono leading-none">⚠️ Сбой</span>
          )}
        </div>

        {/* CUSTOM RIGHT-CLICK CONTEXT MENU OVERLAY */}
        {contextMenu && (
          <div 
            style={{ top: contextMenu.y + 5, left: contextMenu.x + 5 }}
            className="absolute bg-zinc-950 border border-zinc-805 rounded-none shadow-2xl z-[1001] p-1 text-[10px] select-none pointer-events-auto min-w-[160px] glow-indigo"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              onClick={handleCreateCardFromContext}
              className="w-full text-left p-1.5 hover:bg-zinc-900 text-zinc-200 hover:text-white rounded-none flex items-center font-mono text-[9px] cursor-pointer"
            >
              📍 Добавить карточкой на доску
            </button>
            <div className="h-px bg-zinc-900 my-0.5" />
            <div className="px-1.5 py-0.5 text-[8px] text-zinc-500 font-mono">
              {contextMenu.lat.toFixed(5)}, {contextMenu.lng.toFixed(5)}
            </div>
          </div>
        )}

        {/* FLOATING MAP CONTROLS OVERLAY */}
        <div 
          className="absolute top-2.5 right-2.5 p-1 bg-zinc-950/95 rounded-none border border-zinc-850 shadow-md flex items-center space-x-1.5 z-[1000] glow-indigo"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const targetState = !is3DEnabled;
              setIs3DEnabled(targetState);
              if (targetState && mapRef.current && mapRef.current.getZoom() < 15) {
                mapRef.current.setZoom(16);
              }
            }}
            className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-none font-mono text-[9px] transition-all duration-155 border cursor-pointer select-none ${
               is3DEnabled 
                ? 'bg-indigo-950/90 border-indigo-700 text-indigo-400 font-bold glow-indigo' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-350 hover:border-zinc-700'
            }`}
          >
            <span className="glow-text-indigo">3D</span>
          </button>
        </div>
      </div>
    </div>
  );
}
