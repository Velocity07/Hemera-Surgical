import React, { useState } from 'react';

interface ClinicalControlsProps {
  onSwitchCase?: (caseId: string) => void;
  onRecordEvent?: (eventName: string) => void;
}

export const ClinicalControls: React.FC<ClinicalControlsProps> = ({ onSwitchCase, onRecordEvent }) => {
  const [activeCase, setActiveCase] = useState('CASE-1042');
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const handleCaseSelect = (caseId: string) => {
    setActiveCase(caseId);
    if (onSwitchCase) onSwitchCase(caseId);
  };

  const handleEvent = (event: string) => {
    setLastEvent(`${event} @ ${new Date().toLocaleTimeString()}`);
    if (onRecordEvent) onRecordEvent(event);
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-[#0B0F17] border border-[#161F2E] rounded shadow-lg font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-1">
        <span className="text-[10px] uppercase font-bold text-slate-300">Intraoperative Workstation Feed</span>
        <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
          LIVE CLINICAL INGESTION
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { id: 'CASE-1042', label: 'Case 1042: Laparoscopic' },
          { id: 'CASE-2291', label: 'Case 2291: Off-Pump CABG' },
          { id: 'CASE-3408', label: 'Case 3408: Craniotomy' },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => handleCaseSelect(c.id)}
            className={`px-2 py-1 text-[9px] rounded border transition-all text-left truncate ${activeCase === c.id
                ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
        <span className="text-[9px] text-slate-400">Clinical Markers:</span>
        <div className="flex gap-1">
          {['Incision', 'Bolus', 'Deepen'].map((evt) => (
            <button
              key={evt}
              onClick={() => handleEvent(evt)}
              className="px-1.5 py-0.5 text-[8px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded"
            >
              +{evt}
            </button>
          ))}
        </div>
      </div>
      {lastEvent && <div className="text-[8px] text-cyan-400 text-right">{lastEvent}</div>}
    </div>
  );
};