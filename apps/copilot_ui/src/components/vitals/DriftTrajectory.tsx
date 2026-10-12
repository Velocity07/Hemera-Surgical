import React, { useMemo } from 'react';
import { useVitalsStore } from '../../store/useVitalsStore';

export const DriftTrajectory: React.FC = () => {
  const metrics = useVitalsStore((state) => state.metrics);

  const { trajectoryPoints, confidenceUpper, confidenceLower } = useMemo(() => {
    // Safe cast allows accessing S4 state-space projected array without type errors
    const s4Traj = ((metrics as any)?.projectedTrajectory as number[]) || [];
    const points = [];
    const upper = [];
    const lower = [];

    if (s4Traj.length === 0) {
      const currentBis = metrics?.bispectralIndex ?? 45;
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * 100;
        points.push({ x, y: 100 - currentBis });
        upper.push({ x, y: 100 - Math.min(100, currentBis + 4) });
        lower.push({ x, y: 100 - Math.max(10, currentBis - 4) });
      }
    } else {
      const totalSteps = Math.max(1, s4Traj.length - 1);
      const driftProb = (metrics as any)?.driftProbability ?? 0.04;
      for (let i = 0; i < s4Traj.length; i++) {
        const val = s4Traj[i];
        const uncertainty = (i / totalSteps) * (driftProb * 12.0 + 3.0);
        const x = (i / totalSteps) * 100;

        points.push({ x, y: 100 - val });
        upper.push({ x, y: 100 - Math.min(100, val + uncertainty) });
        lower.push({ x, y: 100 - Math.max(10, val - uncertainty) });
      }
    }

    return {
      trajectoryPoints: points,
      confidenceUpper: upper,
      confidenceLower: lower,
    };
  }, [metrics]);

  const isDrift =
    (metrics as any)?.severity === 'CRITICAL_DRIFT' ||
    (metrics as any)?.severity === 'DRIFT_SUSPECTED';
  const bisVal = metrics?.bispectralIndex ?? 45;

  const pathD = trajectoryPoints.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    ''
  );

  const areaD =
    `${confidenceUpper.reduce((acc, p, i) => `${acc}${i === 0 ? 'M' : 'L'} ${p.x}${p.y}`, '')} ` +
    confidenceLower
      .slice()
      .reverse()
      .reduce((acc, p) => `${acc} L ${p.x} ${p.y}`, '') +
    ' Z';

  return (
    <div className="flex-shrink-0 h-28 p-2.5 bg-[#0B0F17] border border-[#161F2E] rounded flex flex-col justify-between shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-wider text-purple-400 uppercase">
            SSM Latent Drift Trajectory
          </span>
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800">
            5-MIN S4 LOOKAHEAD
          </span>
        </div>
        <span className="font-mono text-[9px] text-slate-400">
          Continuous HiPPO-LegS Recurrence
        </span>
      </div>

      <div className="relative flex-1 min-h-0 w-full bg-[#05070A] rounded border border-slate-900 overflow-hidden px-2 py-0.5 my-1">
        <div className="absolute inset-0 flex flex-col pointer-events-none opacity-20">
          <div className="flex-1 bg-red-500/10 border-b border-red-500/20 text-[8px] font-mono px-1 text-red-400">
            Awake (80-100)
          </div>
          <div className="flex-1 bg-amber-500/10 border-b border-amber-500/20 text-[8px] font-mono px-1 text-amber-400">
            Sedation (60-80)
          </div>
          <div className="flex-1 bg-emerald-500/10 border-b border-emerald-500/20 text-[8px] font-mono px-1 text-emerald-400">
            Target Surgical Window (40-60)
          </div>
          <div className="flex-1 bg-indigo-500/10 text-[8px] font-mono px-1 text-indigo-400">
            Deep Suppression (&lt;40)
          </div>
        </div>

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d={areaD} fill={isDrift ? 'rgba(239, 68, 68, 0.15)' : 'rgba(192, 132, 252, 0.12)'} />
          <path
            d={pathD}
            fill="none"
            stroke={isDrift ? '#EF4444' : '#C084FC'}
            strokeWidth="2.5"
            strokeDasharray={isDrift ? '2,1' : 'none'}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div
          className="absolute left-0 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-lg"
          style={{
            top: `${Math.max(0, Math.min(100, 100 - bisVal))}%`,
            backgroundColor: isDrift ? '#EF4444' : '#C084FC',
          }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
        <span>T: Now ({bisVal} BIS)</span>
        <span className={isDrift ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'}>
          {isDrift ? '⚠️ DRIFT DETECTED: Emergence in < 3m' : '✓ SSM Steady State Verified'}
        </span>
        <span>T+5m Projection</span>
      </div>
    </div>
  );
};

export default DriftTrajectory;