// Edited by Claude.
// Deterministic "spine cluster" — a few book spines of varied height standing
// on a shelf. Used as a library's visual identity (libraries have no cover art).
// Colors + heights are derived from the library name so a given library always
// renders the same cluster. Decorative only (aria-hidden).
import { cn } from '@/lib/utils';

// Warm spine palette (sienna / green / ochre / slate-blue / plum / olive).
const SPINE_COLORS = [
  'linear-gradient(165deg,#cf6a3c,#9a3f1f)',
  'linear-gradient(165deg,#4a6f5f,#274038)',
  'linear-gradient(165deg,#d09636,#9a6618)',
  'linear-gradient(165deg,#5f7b8f,#33485a)',
  'linear-gradient(165deg,#9a6f8a,#5f3f57)',
  'linear-gradient(165deg,#8a8a4f,#5a5a2f)',
];
const HEIGHTS = [100, 76, 92, 64, 84];

const hashStr = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const SpineCluster = ({ name = '', muted = false }) => {
  const h = hashStr(name);
  const count = 3 + (h % 2); // 3 or 4 spines
  const spines = Array.from({ length: count }, (_, i) => ({
    bg: SPINE_COLORS[(h >> (i * 2)) % SPINE_COLORS.length],
    height: HEIGHTS[(h >> (i * 3 + 1)) % HEIGHTS.length],
  }));

  return (
    <div className={cn('flex h-12 items-end gap-[3px]', muted && 'opacity-80')} aria-hidden="true">
      {spines.map((sp, i) => (
        <div
          key={i}
          className="w-2 rounded-[2px_2px_1px_1px]"
          style={{
            height: `${sp.height}%`,
            background: sp.bg,
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.20), 1px 2px 3px rgba(74,58,36,0.22)',
          }}
        />
      ))}
    </div>
  );
};

export default SpineCluster;
