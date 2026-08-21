import svgPaths from "./svg-v1nyaypjkj";

function BgFill() {
  return <div className="absolute bg-[rgba(255,255,255,0.9)] h-[48px] left-0 top-0 w-[980px]" data-name="BG fill" />;
}

function Links() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0" data-name="Links">
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Link">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Free E-book
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Blog">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Blog
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="About">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          About
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="h-0 relative shrink-0 w-[100px]" data-name="Header">
      <div className="flex flex-row items-center size-full">
        <div className="size-full" />
      </div>
    </div>
  );
}

function DaysRow() {
  return (
    <div className="content-stretch flex gap-[28px] items-center relative shrink-0" data-name="Days/Row">
      <Header />
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          MON
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          TUE
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          WED
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          THU
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          FRI
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          SAT
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="TimelineHeader">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          SUN
        </p>
      </div>
    </div>
  );
}

function Top() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          mon
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#c81d6b] text-[12px] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        strength
      </p>
    </div>
  );
}

function LucideDumbbell() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/dumbbell">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_2143)" id="lucide/dumbbell">
          <path d={svgPaths.p27368880} id="Vector" stroke="var(--stroke-0, #C81D6B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_1_2143">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Bottom() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucideDumbbell />
    </div>
  );
}

function Body() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-h-px min-w-px relative w-full" data-name="Body">
      <Middle />
      <Bottom />
    </div>
  );
}

function Top1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          tue
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[12px] text-[rgba(18,18,18,0.72)] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        rest
      </p>
    </div>
  );
}

function LucideMoon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/moon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/moon">
          <path d={svgPaths.p7ec300} id="Vector" stroke="var(--stroke-0, #616161)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Bottom1() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucideMoon />
    </div>
  );
}

function Body1() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-h-px min-w-px relative w-full" data-name="Body">
      <Middle1 />
      <Bottom1 />
    </div>
  );
}

function Top2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          wed
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#00796b] text-[12px] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        recovery
      </p>
    </div>
  );
}

function LucidePersonStanding() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/person-standing">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/person-standing">
          <path d={svgPaths.p1a87fc00} id="Vector" stroke="var(--stroke-0, #00796B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Bottom2() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucidePersonStanding />
    </div>
  );
}

function Body2() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-h-px min-w-px relative w-full" data-name="Body">
      <Middle2 />
      <Bottom2 />
    </div>
  );
}

function Top3() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          thu
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#c81d6b] text-[12px] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        strength
      </p>
    </div>
  );
}

function LucideDumbbell1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/dumbbell">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_2143)" id="lucide/dumbbell">
          <path d={svgPaths.p27368880} id="Vector" stroke="var(--stroke-0, #C81D6B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_1_2143">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Bottom3() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucideDumbbell1 />
    </div>
  );
}

function Body3() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-h-px min-w-px relative w-full" data-name="Body">
      <Middle3 />
      <Bottom3 />
    </div>
  );
}

function Top4() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          fri
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[12px] text-[rgba(18,18,18,0.72)] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        rest
      </p>
    </div>
  );
}

function LucideMoon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/moon">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/moon">
          <path d={svgPaths.p7ec300} id="Vector" stroke="var(--stroke-0, #616161)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Bottom4() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucideMoon1 />
    </div>
  );
}

function Body4() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-h-px min-w-px relative w-full" data-name="Body">
      <Middle4 />
      <Bottom4 />
    </div>
  );
}

function Top5() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          sun
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#00796b] text-[12px] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        recovery
      </p>
    </div>
  );
}

function LucidePersonStanding1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/person-standing">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/person-standing">
          <path d={svgPaths.p1a87fc00} id="Vector" stroke="var(--stroke-0, #00796B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Bottom5() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucidePersonStanding1 />
    </div>
  );
}

function Body5() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-start min-h-px min-w-px relative w-full" data-name="Body">
      <Middle5 />
      <Bottom5 />
    </div>
  );
}

function Top6() {
  return (
    <div className="relative shrink-0 w-full" data-name="Top">
      <div className="content-stretch flex items-center overflow-clip relative rounded-[inherit] w-full">
        <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] relative shrink-0 text-[#616161] text-[8px] tracking-[0.96px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          sat
        </p>
      </div>
      <div aria-hidden="true" className="absolute border-[rgba(233,230,226,0.6)] border-b border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Middle6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Middle">
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#c81d6b] text-[12px] tracking-[1.92px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        strength
      </p>
    </div>
  );
}

function LucideDumbbell2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/dumbbell">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_2143)" id="lucide/dumbbell">
          <path d={svgPaths.p27368880} id="Vector" stroke="var(--stroke-0, #C81D6B)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <defs>
          <clipPath id="clip0_1_2143">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function Bottom6() {
  return (
    <div className="content-stretch flex items-center justify-center overflow-clip relative shrink-0 w-full" data-name="Bottom">
      <LucideDumbbell2 />
    </div>
  );
}

function Body6() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] items-center justify-center min-h-px min-w-px relative w-full" data-name="Body">
      <Middle6 />
      <Bottom6 />
    </div>
  );
}

function DaysRow1() {
  return (
    <div className="content-stretch flex gap-[28px] items-center relative shrink-0" data-name="Days/Row">
      <div className="content-stretch flex items-center justify-center overflow-clip p-[8px] relative shrink-0 w-[100px]" data-name="RowLabel">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#616161] text-[11px] tracking-[1.54px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Week 1
        </p>
      </div>
      <div className="bg-[rgba(200,29,107,0.1)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top />
          <Body />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(247,243,240,0.6)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top1 />
          <Body1 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(0,121,107,0.1)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top2 />
          <Body2 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(200,29,107,0.1)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top3 />
          <Body3 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(247,243,240,0.6)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top4 />
          <Body4 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(0,121,107,0.1)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top5 />
          <Body5 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
      <div className="bg-[rgba(200,29,107,0.1)] relative shrink-0 size-[100px]" data-name="TimelinGridDay">
        <div className="content-stretch flex flex-col gap-[4px] items-start overflow-clip p-[8px] relative rounded-[inherit] size-full">
          <Top6 />
          <Body6 />
        </div>
        <div aria-hidden="true" className="absolute border border-[rgba(233,230,226,0.25)] border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function DaysGrid() {
  return (
    <div className="content-stretch flex flex-col gap-[28px] items-center justify-center relative shrink-0" data-name="Days/Grid">
      <DaysRow />
      <DaysRow1 />
    </div>
  );
}

function Rail() {
  return (
    <div className="absolute content-stretch flex flex-col h-[974px] items-center justify-center left-[99px] p-[10px] top-[50px] w-[1244px]" data-name="Rail">
      <DaysGrid />
    </div>
  );
}

export default function Desktop() {
  return (
    <div className="bg-white relative size-full" data-name="Desktop - 7">
      <div className="absolute bg-[#f8f8f8] content-stretch flex h-[48px] items-center justify-between left-0 px-[96px] top-px w-[1440px]" data-name="Nav">
        <div aria-hidden="true" className="absolute border-[#e9e6e2] border-b border-solid inset-[0_0_-1px_0] pointer-events-none" />
        <BgFill />
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links />
      </div>
      <Rail />
    </div>
  );
}