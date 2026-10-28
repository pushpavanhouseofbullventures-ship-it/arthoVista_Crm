import React from 'react';
import { getWatermarkStatusInfo } from '../utils/watermark';
import type { DocumentWatermarkType, WatermarkStatusInfo } from '../utils/watermark';

export { getWatermarkStatusInfo };
export type { DocumentWatermarkType, WatermarkStatusInfo };

export interface DocumentWatermarkProps {
  brandText?: string;
  subText?: string;
  documentType?: DocumentWatermarkType;
  status?: string;
  showStatusStamp?: boolean;
  opacityClass?: string;
}

export const DocumentWatermark: React.FC<DocumentWatermarkProps> = ({
  brandText = 'ArthoVista',
  subText = 'BUSINESS GROWTH MADE SIMPLE',
  documentType = 'quotation',
  status = 'draft',
  showStatusStamp = true
}) => {
  const statusInfo = showStatusStamp ? getWatermarkStatusInfo(status, documentType) : null;
  const docTypeLabel = documentType === 'invoice' ? 'TAX INVOICE' : 'QUOTATION';

  return (
    <div
      aria-hidden="true"
      className="document-watermark absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex flex-col items-center justify-center p-6"
      style={{
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        background: 'transparent'
      }}
    >
      {/* 1. Primary Central Diagonal Brand Watermark */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="transform -rotate-[28deg] flex flex-col items-center justify-center text-center space-y-1 watermark-brand-container">
          
          {/* Subtle Artho Vista Tri-Curve Crest SVG */}
          <svg
            className="w-24 h-24 sm:w-32 sm:h-32 text-slate-900/[0.045] dark:text-slate-900/[0.05] watermark-text mb-1"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Outer Hex Shield */}
            <polygon points="50,5 92,27 92,73 50,95 8,73 8,27" strokeDasharray="3 3" opacity="0.6" />
            {/* Tri-Color Mountain / Vista Swashes */}
            <path d="M 22 72 Q 40 38 78 28" strokeWidth="5" />
            <path d="M 28 76 Q 48 46 82 42" strokeWidth="4" />
            <path d="M 36 80 Q 56 56 86 58" strokeWidth="3" />
            <circle cx="50" cy="50" r="14" strokeWidth="2" strokeDasharray="2 2" />
          </svg>

          {/* Majestic Brand Title */}
          <span className="watermark-text text-5xl sm:text-7xl font-black tracking-[0.16em] text-slate-900/[0.05] dark:text-slate-900/[0.055] font-sans leading-none pl-4">
            {brandText}
          </span>

          {/* Document Type & Tagline */}
          <div className="flex items-center space-x-3 pt-2">
            <span className="h-[1px] w-10 sm:w-16 bg-slate-900/[0.05] dark:bg-slate-900/[0.05]" />
            <span className="watermark-text text-[10px] sm:text-xs font-black uppercase tracking-[0.35em] text-slate-900/[0.04] dark:text-slate-900/[0.045]">
              {docTypeLabel} • {subText}
            </span>
            <span className="h-[1px] w-10 sm:w-16 bg-slate-900/[0.05] dark:bg-slate-900/[0.05]" />
          </div>
        </div>
      </div>

      {/* 2. Secondary Official Status Stamp (Angled Stamp Effect) */}
      {statusInfo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-24 transform -rotate-12 pointer-events-none">
          <div
            className={`border-4 border-dashed ${statusInfo.borderClass} ${statusInfo.stampClass} rounded-2xl px-6 py-2 sm:px-8 sm:py-3 text-center backdrop-blur-none`}
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <p className={`text-xl sm:text-2xl font-black uppercase tracking-[0.25em] ${statusInfo.textClass} leading-tight`}>
              {statusInfo.text}
            </p>
            <p className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.3em] ${statusInfo.textClass} mt-0.5 opacity-80`}>
              {statusInfo.sub}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
export default DocumentWatermark;
