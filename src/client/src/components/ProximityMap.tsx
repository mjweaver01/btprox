import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type PointerEvent,
} from 'react';
import type { BtDevice } from '@shared/types';
import { useBluetooth } from '../context/BluetoothContext';

interface ProximityMapProps {
  devices: BtDevice[];
  onDeviceClick?: (device: BtDevice) => void;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

// Stable angle assignment based on device ID hash
function assignAngles(devices: BtDevice[]): Map<string, number> {
  const angles = new Map<string, number>();
  for (const device of devices) {
    let hash = 0;
    for (let i = 0; i < device.id.length; i++) {
      hash = ((hash << 5) - hash + device.id.charCodeAt(i)) | 0;
    }
    angles.set(device.id, ((hash % 3600) / 3600) * Math.PI * 2);
  }
  return angles;
}

export function ProximityMap({ devices, onDeviceClick }: ProximityMapProps) {
  const { config } = useBluetooth();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(
    new Set()
  );
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const { nearThresholdMeters, farThresholdMeters } = config;

  const maxDistance = useMemo(() => {
    const farthest = devices.reduce(
      (max, d) =>
        Math.max(max, d.estimatedDistance > 0 ? d.estimatedDistance : 0),
      0
    );
    return Math.max(farThresholdMeters * 1.5, farthest * 1.2, 5);
  }, [devices, farThresholdMeters]);

  const angles = useMemo(() => assignAngles(devices), [devices]);

  // SVG viewBox dimensions
  const size = 500;
  const cx = size / 2;
  const cy = size / 2;
  const padding = 50;
  const radius = (size - padding * 2) / 2;

  const distToRadius = (dist: number) => {
    if (dist <= 0) return radius * 0.15;
    return Math.min((dist / maxDistance) * radius, radius);
  };

  const nearR = distToRadius(nearThresholdMeters);
  const farR = distToRadius(farThresholdMeters);

  const rings = [
    {
      r: nearR,
      label: `${nearThresholdMeters}m`,
      color: 'rgba(59, 130, 246, 0.3)',
    },
    {
      r: farR,
      label: `${farThresholdMeters}m`,
      color: 'rgba(239, 68, 68, 0.2)',
    },
    {
      r: radius,
      label: `${Math.round(maxDistance)}m`,
      color: 'rgba(113, 113, 122, 0.15)',
    },
  ];

  const getDeviceCategory = (device: BtDevice): string => {
    if (device.isTracked) return 'tracked';
    return device.proximity; // 'near' | 'far' | 'unknown'
  };

  const getDeviceColor = (device: BtDevice) => {
    if (device.isTracked)
      return {
        fill: '#3b82f6',
        stroke: '#60a5fa',
        glow: 'rgba(59, 130, 246, 0.4)',
      };
    if (device.proximity === 'near')
      return {
        fill: '#22d3ee',
        stroke: '#67e8f9',
        glow: 'rgba(34, 211, 238, 0.3)',
      };
    if (device.proximity === 'far')
      return {
        fill: '#f87171',
        stroke: '#fca5a5',
        glow: 'rgba(248, 113, 113, 0.3)',
      };
    return {
      fill: '#a1a1aa',
      stroke: '#d4d4d8',
      glow: 'rgba(161, 161, 170, 0.2)',
    };
  };

  const toggleCategory = useCallback((cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const visibleDevices = useMemo(
    () => devices.filter(d => !hiddenCategories.has(getDeviceCategory(d))),
    [devices, hiddenCategories]
  );

  // Zoom via scroll wheel — must use native listener with { passive: false }
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      setZoom(z => {
        const next = e.deltaY < 0 ? z * (1 + ZOOM_STEP) : z / (1 + ZOOM_STEP);
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // Pan via pointer drag
  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      // Only pan on background drag (not on device nodes)
      if ((e.target as Element).closest('[data-device]')) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (!isPanning) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      // Convert pixel movement to SVG units
      const scale = size / rect.width / zoom;
      const dx = (e.clientX - panStart.current.x) * scale;
      const dy = (e.clientY - panStart.current.y) * scale;
      setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
    },
    [isPanning, zoom]
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Compute viewBox based on zoom and pan
  const vbSize = size / zoom;
  const vbX = cx - vbSize / 2 - pan.x;
  const vbY = cy - vbSize / 2 - pan.y;

  // Scale-aware sizes so labels/nodes don't shrink when zoomed in
  const invZoom = 1 / zoom;
  const labelSize = Math.max(9, 10 * invZoom);
  const zoneSize = Math.max(8, 10 * invZoom);

  return (
    <div className="relative w-full aspect-square max-h-[calc(100vh-14rem)] mx-auto [&>svg]:max-h-full">
      <svg
        ref={svgRef}
        viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
        className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Background (hit target for panning) */}
        <rect
          x={vbX}
          y={vbY}
          width={vbSize}
          height={vbSize}
          fill="transparent"
        />

        {/* Concentric distance rings */}
        {rings.map((ring, i) => (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={ring.r}
              fill="none"
              stroke={ring.color}
              strokeWidth={1 * invZoom}
              strokeDasharray={
                i === 2 ? `${4 * invZoom} ${4 * invZoom}` : 'none'
              }
            />
            <text
              x={cx + ring.r + 4 * invZoom}
              y={cy - 4 * invZoom}
              fill="rgb(113, 113, 122)"
              fontSize={labelSize}
              fontFamily="monospace"
            >
              {ring.label}
            </text>
          </g>
        ))}

        {/* Cross hairs */}
        <line
          x1={cx}
          y1={cy - radius}
          x2={cx}
          y2={cy + radius}
          stroke="rgba(113, 113, 122, 0.1)"
          strokeWidth={1 * invZoom}
        />
        <line
          x1={cx - radius}
          y1={cy}
          x2={cx + radius}
          y2={cy}
          stroke="rgba(113, 113, 122, 0.1)"
          strokeWidth={1 * invZoom}
        />

        {/* Zone labels — on the ring lines, left side */}
        <text
          x={cx - nearR}
          y={cy - 4 * invZoom}
          textAnchor="end"
          fill="rgba(59, 130, 246, 0.5)"
          fontSize={zoneSize}
          fontFamily="sans-serif"
          dx={-4 * invZoom}
        >
          NEAR
        </text>
        <text
          x={cx - farR}
          y={cy - 4 * invZoom}
          textAnchor="end"
          fill="rgba(239, 68, 68, 0.4)"
          fontSize={zoneSize}
          fontFamily="sans-serif"
          dx={-4 * invZoom}
        >
          FAR
        </text>

        {/* Connection lines from center to each device */}
        {visibleDevices.map(device => {
          const angle = angles.get(device.id) ?? 0;
          const r = distToRadius(device.estimatedDistance);
          const dx = cx + Math.cos(angle) * r;
          const dy = cy + Math.sin(angle) * r;
          const isHovered = hoveredId === device.id;

          return (
            <line
              key={`line-${device.id}`}
              x1={cx}
              y1={cy}
              x2={dx}
              y2={dy}
              stroke={
                isHovered
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'rgba(113, 113, 122, 0.08)'
              }
              strokeWidth={1 * invZoom}
              strokeDasharray={`${2 * invZoom} ${3 * invZoom}`}
            />
          );
        })}

        {/* Source node (center) */}
        <circle
          cx={cx}
          cy={cy}
          r={8 * invZoom}
          fill="#3b82f6"
          stroke="#93c5fd"
          strokeWidth={2 * invZoom}
        />
        <circle
          cx={cx}
          cy={cy}
          r={14 * invZoom}
          fill="none"
          stroke="rgba(59, 130, 246, 0.3)"
          strokeWidth={1 * invZoom}
        >
          <animate
            attributeName="r"
            values={`${14 * invZoom};${20 * invZoom};${14 * invZoom}`}
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0;1"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <text
          x={cx}
          y={cy + 26 * invZoom}
          textAnchor="middle"
          fill="#93c5fd"
          fontSize={10 * invZoom}
          fontWeight="bold"
          fontFamily="sans-serif"
        >
          YOU
        </text>

        {/* Device nodes */}
        {visibleDevices.map(device => {
          const angle = angles.get(device.id) ?? 0;
          const r = distToRadius(device.estimatedDistance);
          const dx = cx + Math.cos(angle) * r;
          const dy = cy + Math.sin(angle) * r;
          const colors = getDeviceColor(device);
          const isHovered = hoveredId === device.id;
          const baseR = isHovered ? 7 : device.isTracked ? 6 : 5;
          const nodeR = baseR * invZoom;
          const displayName = device.name || device.deviceType || 'Unknown';
          const truncatedName =
            displayName.length > 16
              ? displayName.slice(0, 15) + '\u2026'
              : displayName;

          return (
            <g
              key={device.id}
              data-device={device.id}
              className="cursor-pointer"
              style={{
                transform: `translate(${dx}px, ${dy}px)`,
                transition: 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
              onMouseEnter={() => setHoveredId(device.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onDeviceClick?.(device)}
            >
              {/* Glow */}
              {(isHovered || device.isTracked) && (
                <circle
                  cx={0}
                  cy={0}
                  r={nodeR + 6 * invZoom}
                  fill={colors.glow}
                />
              )}

              {/* Node */}
              <circle
                cx={0}
                cy={0}
                r={nodeR}
                fill={colors.fill}
                stroke={isHovered ? '#fff' : colors.stroke}
                strokeWidth={(isHovered ? 2 : 1.5) * invZoom}
              />

              {/* Label */}
              {(isHovered || device.isTracked) &&
                (() => {
                  const labelW = (truncatedName.length * 6.5 + 12) * invZoom;
                  const labelH = 18 * invZoom;
                  const labelX = -labelW / 2;
                  const labelY = -nodeR - labelH - 4 * invZoom;
                  return (
                    <g>
                      <rect
                        x={labelX}
                        y={labelY}
                        width={labelW}
                        height={labelH}
                        rx={4 * invZoom}
                        fill="rgba(24, 24, 27, 0.9)"
                        stroke={colors.stroke}
                        strokeWidth={0.5 * invZoom}
                      />
                      <text
                        x={0}
                        y={labelY + labelH / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={colors.stroke}
                        fontSize={10 * invZoom}
                        fontFamily="sans-serif"
                      >
                        {truncatedName}
                      </text>
                    </g>
                  );
                })()}

              {/* Distance label */}
              {(isHovered || device.isTracked) &&
                device.estimatedDistance > 0 && (
                  <text
                    x={0}
                    y={nodeR + 14 * invZoom}
                    textAnchor="middle"
                    fill="rgb(161, 161, 170)"
                    fontSize={9 * invZoom}
                    fontFamily="monospace"
                  >
                    {device.estimatedDistance.toFixed(1)}m
                  </text>
                )}
            </g>
          );
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          onClick={() =>
            setZoom(z => Math.min(MAX_ZOOM, z * (1 + ZOOM_STEP * 2)))
          }
          className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() =>
            setZoom(z => Math.max(MIN_ZOOM, z / (1 + ZOOM_STEP * 2)))
          }
          className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center"
        >
          -
        </button>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button
            onClick={resetView}
            className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[10px] hover:bg-zinc-700 transition-colors flex items-center justify-center"
            title="Reset view"
          >
            &#x21ba;
          </button>
        )}
      </div>

      {/* Zoom level indicator */}
      {zoom !== 1 && (
        <div className="absolute top-2 left-2 text-[10px] text-zinc-500 bg-zinc-800/60 rounded px-1.5 py-0.5">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Legend (clickable filters) */}
      <div className="absolute bottom-2 left-2 flex gap-1 text-[10px]">
        {(
          [
            { key: 'near', label: 'Near', color: 'bg-cyan-400' },
            { key: 'far', label: 'Far', color: 'bg-red-400' },
            { key: 'unknown', label: 'Unknown', color: 'bg-zinc-400' },
            { key: 'tracked', label: 'Tracked', color: 'bg-blue-500' },
          ] as const
        ).map(({ key, label, color }) => {
          const hidden = hiddenCategories.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleCategory(key)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 transition-colors ${
                hidden
                  ? 'bg-zinc-800/60 text-zinc-600 line-through'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${hidden ? 'bg-zinc-700' : color}`}
              />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
