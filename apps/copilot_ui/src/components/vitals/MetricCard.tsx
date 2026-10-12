import React from 'react';

export interface MetricCardProps {
    label: string;
    value: string | number;
    unit: string;
    source?: string;
    subValue?: string;
    minNorm?: number;
    maxNorm?: number;
    color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
    label,
    value,
    unit,
    source,
    subValue,
    minNorm,
    maxNorm,
    color = '#10B981',
}) => {
    return (
        <div className="p-3 bg-[#0B0F17] border border-[#161F2E] rounded flex flex-col justify-between font-mono shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/60 pb-1">
                <span className="font-bold tracking-wider text-slate-300">{label}</span>
                <div className="flex items-center gap-1.5">
                    {source && (
                        <span className="px-1 py-0.5 rounded bg-slate-800/80 text-[9px] text-slate-400 border border-slate-700/60">
                            {source}
                        </span>
                    )}
                    <span className="text-slate-400 text-[9px]">{unit}</span>
                </div>
            </div>

            {/* Main Metric Value */}
            <div className="my-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight" style={{ color }}>
                    {value}
                </span>
                {subValue && (
                    <span className="text-sm font-semibold text-slate-400">
                        {subValue}
                    </span>
                )}
            </div>

            {/* Normal Range Reference */}
            <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-slate-800/40 pt-1">
                <span>Target Window</span>
                <span className="text-slate-400">
                    {minNorm !== undefined && maxNorm !== undefined
                        ? `${minNorm} - ${maxNorm}`
                        : 'Clinical Baseline'}
                </span>
            </div>
        </div>
    );
};