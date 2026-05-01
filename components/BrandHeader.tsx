import Image from 'next/image';
import Link from 'next/link';

interface BrandHeaderProps {
  subtitle?: string;
  rightContent?: React.ReactNode;
}

export function BrandHeader({ subtitle, rightContent }: BrandHeaderProps) {
  return (
    <header className="bg-[#003366] text-white px-8 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        {/* Tamil Nadu Govt Emblem */}
        <div className="w-11 h-11 rounded-full bg-white p-0.5 flex-none shadow-md">
          <Image
            src="/tn_emblem.png"
            alt="Government of Tamil Nadu Emblem"
            width={44}
            height={44}
            className="rounded-full object-contain"
          />
        </div>
        <div>
          <p className="text-white/60 text-[10px] font-semibold tracking-widest uppercase leading-tight">
            Government of Tamil Nadu
          </p>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-wide leading-tight">SIPCOT TRACK</span>
            {subtitle && (
              <>
                <span className="text-white/40">|</span>
                <span className="text-white/70 text-sm">{subtitle}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {rightContent && (
        <div className="flex items-center gap-5">
          {rightContent}
        </div>
      )}
    </header>
  );
}
