import React, { useRef, useState, useEffect } from 'react';
import { OCRBlock } from '../types';

interface AnnotatedImageProps {
  imageSrc: string;
  blocks: OCRBlock[];
}

const AnnotatedImage: React.FC<AnnotatedImageProps> = ({ imageSrc, blocks }) => {
  const [hoveredBlockIndex, setHoveredBlockIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const copyText = (text: string) => {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error("复制失败", err);
      });
    } else {
      // 旧浏览器兼容
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (e) {
        console.error("复制失败", e);
      }
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="relative w-full h-full bg-soft-50 rounded-xl overflow-hidden border border-soft-200 flex items-center justify-center group">
      {/* Container to maintain aspect ratio relative to image */}
      <div className="relative inline-block max-w-full max-h-full">
        <img 
          src={imageSrc} 
          alt="Original" 
          className="max-w-full max-h-[60vh] object-contain block select-none"
        />
        
        {/* Overlay Layer */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {blocks.map((block, idx) => {
            const [ymin, xmin, ymax, xmax] = block.box_2d;
            // Convert 1000-based coordinates to percentages
            const top = ymin / 10;
            const left = xmin / 10;
            const height = (ymax - ymin) / 10;
            const width = (xmax - xmin) / 10;

            const isHovered = hoveredBlockIndex === idx;

            return (
              <div
                key={idx}
                className={`absolute border transition-colors duration-200 pointer-events-auto cursor-pointer
                  ${isHovered ? 'border-primary-500 bg-primary-500/20 z-10' : 'border-primary-400/50 hover:border-primary-500 hover:bg-primary-500/10'}`}
                style={{
                  top: `${top}%`,
                  left: `${left}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
                onMouseEnter={() => setHoveredBlockIndex(idx)}
                onMouseLeave={() => setHoveredBlockIndex(null)}
                onClick={() => copyText(block.text)}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-0 z-20 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-[220px] truncate pointer-events-none">
                    <span className="opacity-80">{block.text}</span>
                    <span className="ml-1 text-[10px] text-primary-200">（点击复制）</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Empty State / Placeholder if image breaks */}
       {!imageSrc && (
          <div className="text-soft-400 flex flex-col items-center">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>无图片预览</span>
          </div>
       )}
    </div>
  );
};

export default AnnotatedImage;