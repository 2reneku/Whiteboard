import React, { useState, useEffect, useRef } from 'react';
import { OSINTNode } from '../types';
import maplibregl from 'maplibre-gl';

interface MapCardNodeProps {
  node: OSINTNode;
  onUpdateNode: (node: OSINTNode) => void;
  scale?: number;
}

export default function MapCardNode({ node, onUpdateNode, scale = 1 }: MapCardNodeProps) {
  const mapData = node.mapData || {
    latitude: 37.7456585,
    longitude: 29.0949765,
    address: '14 Mevlana Caddesi, Denizli, Turkey',
    notes: ''
  };

  const [isEditing, setIsEditing] = useState(false);
  const [latVal, setLatVal] = useState(String(mapData.latitude));
  const [lngVal, setLngVal] = useState(String(mapData.longitude));
  const [addrVal, setAddrVal] = useState(mapData.address);
  const [notesVal, setNotesVal] = useState(mapData.notes || '');

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const mapContainerId = `map-container-${node.id}`;
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const container = document.getElementById(mapContainerId);
    if (!container) return;

    // Initialize MapLibre GL dark theme map
    const map = new maplibregl.Map({
      container: mapContainerId,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: [mapData.longitude, mapData.latitude],
      zoom: 16.2,
      pitch: 55, // Pitch to Tilt to 3-D buildings
      bearing: -12,
      attributionControl: false
    });

    mapRef.current = map;

    map.on('style.load', () => {
      const layers = map.getStyle().layers || [];
      let labelLayerId;
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].type === 'symbol' && layers[i].layout && (layers[i].layout as any)['text-field']) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      // 3D vector extrusion from worldwide OSM OpenFreeMap tiled data
      map.addLayer(
        {
          id: '3d-buildings',
          source: 'openmaptiles',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': 'rgba(56, 189, 248, 0.35)', // Cyber neon-sky outline style buildings
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
            'fill-extrusion-opacity': 0.8
          }
        },
        labelLayerId
      );
    });

    // Elegant Marker Element
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; transform: translateY(-40%); pointer-events: none;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="28px" height="28px" style="filter: drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;

    new maplibregl.Marker({ element: el })
      .setLngLat([mapData.longitude, mapData.latitude])
      .addTo(map);

    setTimeout(() => {
      map.resize();
    }, 250);

    return () => {
      if (map) {
        map.remove();
      }
      mapRef.current = null;
    };
  }, [mapData.latitude, mapData.longitude]);

  // Sync state with node props if node updates from outside
  useEffect(() => {
    setLatVal(String(mapData.latitude));
    setLngVal(String(mapData.longitude));
    setAddrVal(mapData.address);
    setNotesVal(mapData.notes || '');
  }, [node.mapData]);

  // Search address coordinates using Free OpenStreetMap Nominatim
  const handleGeocode = async () => {
    if (!addrVal.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addrVal)}`,
        {
          headers: {
            'Accept-Language': 'ru,en'
          }
        }
      );
      if (!res.ok) throw new Error('Query error');
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLon = parseFloat(item.lon);
        setLatVal(String(newLat));
        setLngVal(String(newLon));
        setAddrVal(item.display_name);

        onUpdateNode({
          ...node,
          label: `📍 ${item.display_name}`,
          mapData: {
            latitude: newLat,
            longitude: newLon,
            address: item.display_name,
            notes: notesVal
          }
        });
      } else {
        setSearchError('Адрес не найден.');
      }
    } catch (err) {
      setSearchError('Ошибка геокодирования.');
    } finally {
      setIsSearching(false);
    }
  };

  // Reverse geocode from Latitude / Longitude numbers
  const handleReverseGeocode = async () => {
    const lat = parseFloat(latVal);
    const lon = parseFloat(lngVal);
    if (isNaN(lat) || isNaN(lon)) {
      setSearchError('Неверные координаты.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept-Language': 'ru,en'
          }
        }
      );
      if (!res.ok) throw new Error('Query error');
      const data = await res.json();
      if (data && data.display_name) {
        setAddrVal(data.display_name);
        onUpdateNode({
          ...node,
          label: `📍 ${data.display_name}`,
          mapData: {
            latitude: lat,
            longitude: lon,
            address: data.display_name,
            notes: notesVal
          }
        });
      } else {
        setSearchError('Место по координатам не найдено.');
      }
    } catch (err) {
      setSearchError('Ошибка обратного геокодирования.');
    } finally {
      setIsSearching(false);
    }
  };

  // Save manual inputs manually
  const handleSaveManual = () => {
    const l = parseFloat(latVal);
    const n = parseFloat(lngVal);
    if (isNaN(l) || isNaN(n)) {
      setSearchError('Неверный формат чисел.');
      return;
    }
    onUpdateNode({
      ...node,
      label: `📍 ${addrVal}`,
      mapData: {
        latitude: l,
        longitude: n,
        address: addrVal,
        notes: notesVal
      }
    });
    setIsEditing(false);
    setSearchError(null);
  };

  return (
    <div
      className="flex flex-col md:flex-row h-full w-full bg-zinc-950/95 text-zinc-100 rounded-none select-text border border-zinc-800 pointer-events-auto"
      style={{ fontSize: '0.86em' }}
      onMouseDown={(e) => {
        // Prevent canvas node dragging when clicking on form controls or inputs
        e.stopPropagation();
      }}
    >
      {/* MAP VIEWPORT CANVASES */}
      <div
        className="w-full md:w-1/2 h-[130px] md:h-full relative overflow-hidden border-b md:border-b-0 md:border-r border-zinc-900 rounded-none"
        onWheel={(e) => {
          e.stopPropagation();
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
        }}
      >
        <div id={mapContainerId} className="w-full h-full text-zinc-900" style={{ minHeight: '100px' }} />
        {isSearching && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center font-mono text-[10px] text-zinc-400 z-[999]">
            🖧 ГЕОКОДИРОВАНИЕ...
          </div>
        )}
      </div>

      {/* METADATA INFO & EDIT FORM PANEL */}
      <div className="w-full md:w-1/2 p-3 font-mono text-left flex flex-col justify-between overflow-y-auto min-h-0">
        <div className="flex flex-col space-y-1.5 flex-1 min-h-0">
          <div className="flex items-center justify-between border-b border-zinc-850 pb-1">
            <span className="text-[10px] font-bold tracking-wider text-rose-500 uppercase glow-text-red">// LOCATION TARGET</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-[9.5px] text-zinc-400 hover:text-white px-2 py-0.5 rounded-none bg-zinc-900 cursor-pointer border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700"
            >
              {isEditing ? 'Просмотр' : 'Изменить'}
            </button>
          </div>

          {searchError && (
            <div className="p-1 px-2 text-[9.5px] bg-red-950/40 border border-red-900/50 text-red-400 rounded-none">
              ⚠️ {searchError}
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col space-y-1.5 my-1.5 pr-0.5">
              <label className="text-[9px] text-zinc-500 font-bold">АДРЕС И КЛЮЧЕВЫЕ СЛОВА:</label>
              <div className="flex space-x-1">
                <input
                  type="text"
                  className="flex-1 text-[11px] bg-zinc-900 border border-zinc-850 text-zinc-100 px-1.5 py-0.5 rounded-none outline-none focus:border-zinc-700 font-mono"
                  value={addrVal}
                  onChange={(e) => setAddrVal(e.target.value)}
                  placeholder="Страна, город, улица..."
                />
                <button
                  onClick={handleGeocode}
                  className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 rounded-none cursor-pointer border border-zinc-700"
                  title="Найти координаты по этому адресу"
                >
                  Поиск
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <div>
                  <label className="text-[9px] text-zinc-500 font-bold">LATITUDE:</label>
                  <input
                    type="text"
                    className="w-full text-[11px] bg-zinc-900 border border-zinc-850 text-zinc-100 px-1.5 py-0.5 rounded-none outline-none focus:border-zinc-700 font-mono"
                    value={latVal}
                    onChange={(e) => setLatVal(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 font-bold">LONGITUDE:</label>
                  <input
                    type="text"
                    className="w-full text-[11px] bg-zinc-900 border border-zinc-850 text-zinc-100 px-1.5 py-0.5 rounded-none outline-none focus:border-zinc-700 font-mono"
                    value={lngVal}
                    onChange={(e) => setLngVal(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleReverseGeocode}
                className="text-[9px] border border-zinc-850 text-zinc-400 hover:text-zinc-200 py-1 mt-1 hover:bg-zinc-900 text-center rounded-none cursor-pointer hover:border-zinc-750"
                title="Определить адрес по введенным координатам"
              >
                Определить адрес по Lat/Lng
              </button>

              <label className="text-[9px] text-zinc-500 font-bold mt-1.5">ОПИСАНИЕ / ЗАМЕТКИ:</label>
              <textarea
                className="w-full text-[11px] bg-zinc-900 border border-zinc-850 text-zinc-100 px-1.5 py-1 rounded-none outline-none resize-none h-11 focus:border-zinc-700 font-sans"
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                placeholder="Дополнительные OSINT-сведения..."
              />
            </div>
          ) : (
            <div className="flex flex-col space-y-1.5 my-1" onMouseDown={e => e.stopPropagation()}>
              <div className="text-[11px] text-zinc-100 font-medium select-all break-words leading-snug">
                📍 {mapData.address}
              </div>
              <div className="grid grid-cols-1 text-[10px] text-zinc-450 gap-0.5">
                <div>
                  <span className="text-zinc-550">LAT:</span> <span className="text-zinc-350 font-mono font-semibold select-all">{mapData.latitude}</span>
                </div>
                <div>
                  <span className="text-zinc-550">LNG:</span> <span className="text-zinc-350 font-mono font-semibold select-all">{mapData.longitude}</span>
                </div>
              </div>
              {mapData.notes && (
                <div className="border-t border-zinc-900 pt-1 mt-1">
                  <div className="text-[9px] text-zinc-500 font-bold">// ЗАМЕТКА ПО ОБЪЕКТУ:</div>
                  <p className="text-[10px] text-zinc-300 italic whitespace-pre-wrap font-sans leading-relaxed select-all">
                    {mapData.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <button
            onClick={handleSaveManual}
            className="w-full text-center text-xs bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold py-1.5 mt-2 rounded-none cursor-pointer border border-rose-800 transition-colors glow-red"
          >
            Сохранить координаты
          </button>
        )}
      </div>
    </div>
  );
}
