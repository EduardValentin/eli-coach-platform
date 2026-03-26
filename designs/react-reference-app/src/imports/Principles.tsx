import svgPaths from "./svg-ybboewgvka";
import imgImagePlaceholder from "figma:asset/54f55ac2d1216e14f8e64fc28bfa707ef09ac3e1.png";
import imgNoise from "figma:asset/59f814a2a0e14fc8c2de2c299c1b276268270780.png";
import imgImagePlaceholder1 from "figma:asset/866775c311078e75091d35087d7fbdaa36a9e0a8.png";
import imgImagePlaceholder2 from "figma:asset/242359847bca91ae7fc0c4e506b756992ab2c406.png";

function Content() {
  return (
    <div className="content-stretch flex gap-[8px] items-end leading-[1.15] relative shrink-0 whitespace-nowrap" data-name="Content">
      <p className="font-['Playfair_Display:Medium',sans-serif] font-medium relative shrink-0 text-[#121212] text-[64px] tracking-[7.68px]">03</p>
      <p className="font-['Playfair_Display:Regular',sans-serif] font-normal relative shrink-0 text-[#616161] text-[20px] tracking-[2.4px]">/04</p>
    </div>
  );
}

function Col() {
  return (
    <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="Col">
      <div className="absolute content-stretch flex flex-col items-start left-0 top-[1026px]" data-name="StepperCount/Stepper">
        <Content />
      </div>
    </div>
  );
}

function VideoTile() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[600px] items-start relative shrink-0 w-[450px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08),0px_0px_24px_4px_rgba(200,29,107,0.2)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col2() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile />
    </div>
  );
}

function Col3() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-[105px] top-[-48px]" data-name="Col">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] opacity-80 relative shrink-0 text-[#616161] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Walk into the gym with a plan
      </p>
    </div>
  );
}

function VideoTile1() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[200px] items-start relative shrink-0 w-[300px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder1} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col4() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile1 />
    </div>
  );
}

function VideoTile2() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[200px] items-start relative shrink-0 w-[300px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder2} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col5() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile2 />
    </div>
  );
}

function Col1() {
  return (
    <div className="content-stretch flex flex-col gap-[128px] h-full items-start justify-center relative shrink-0" data-name="Col">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="PrincipleTile">
        <Col2 />
        <Col3 />
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[10px] items-center left-1/2 opacity-60 top-[30px]" data-name="PrincipleTile">
        <Col4 />
      </div>
      <div className="-translate-x-1/2 absolute bottom-[78px] content-stretch flex gap-[10px] items-center left-1/2 opacity-60" data-name="PrincipleTile">
        <Col5 />
      </div>
    </div>
  );
}

function Row() {
  return (
    <div className="content-stretch flex flex-col font-['DM_Sans:Regular',sans-serif] font-normal gap-[16px] items-end leading-[1.3] relative shrink-0 text-[#616161] text-[16px] tracking-[0.0256px] uppercase whitespace-nowrap" data-name="Row">
      <p className="relative shrink-0" style={{ fontVariationSettings: "'opsz' 14" }}>
        At-home workouts
      </p>
      <p className="relative shrink-0" style={{ fontVariationSettings: "'opsz' 14" }}>{`Calm mind `}</p>
    </div>
  );
}

function Row1() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-end justify-center relative shrink-0" data-name="Row">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] opacity-80 relative shrink-0 text-[#121212] text-[20px] tracking-[0.4px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Gym Workouts
      </p>
      <div className="h-0 relative shrink-0 w-[131px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 131 2">
            <line id="Line 9" stroke="var(--stroke-0, #C81D6B)" strokeWidth="2" x2="131" y1="1" y2="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Row2() {
  return (
    <div className="content-stretch flex items-start justify-end relative shrink-0" data-name="Row">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.3] relative shrink-0 text-[#616161] text-[16px] tracking-[0.0256px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Good Nutrition
      </p>
    </div>
  );
}

function PrinciplesGrid() {
  return (
    <div className="absolute content-stretch flex gap-[24px] h-[1318px] items-start justify-center left-0 px-[48px] top-[48px] w-[1024px]" data-name="Principles/Grid">
      <Col />
      <Col1 />
      <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="StepperTitles/Stepper">
        <div className="flex flex-col items-end size-full">
          <div className="content-stretch flex flex-col items-end justify-between py-[24px] relative size-full">
            <Row />
            <Row1 />
            <Row2 />
          </div>
        </div>
      </div>
    </div>
  );
}

function BgFill() {
  return <div className="absolute bg-[rgba(255,255,255,0.9)] h-[48px] left-0 top-0 w-[688px]" data-name="BG fill" />;
}

function Links() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0 w-[1024px]" data-name="Links">
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

function IPadPro() {
  return (
    <div className="absolute bg-white h-[1366px] left-0 overflow-clip top-[1177px] w-[1024px]" data-name="iPad Pro 12.9' - 3">
      <PrinciplesGrid />
      <div className="absolute bg-[#f8f8f8] h-[48px] left-0 top-0 w-[1024px]" data-name="Nav">
        <div className="content-stretch flex items-center justify-between overflow-clip px-[64px] relative rounded-[inherit] size-full">
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
        <div aria-hidden="true" className="absolute border-[#e9e6e2] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function Content1() {
  return (
    <div className="content-stretch flex gap-[8px] items-end leading-[1.15] relative shrink-0 w-full whitespace-nowrap" data-name="Content">
      <p className="font-['Playfair_Display:Medium',sans-serif] font-medium relative shrink-0 text-[#121212] text-[96px] tracking-[11.52px]">03</p>
      <p className="font-['Playfair_Display:Regular',sans-serif] font-normal relative shrink-0 text-[#616161] text-[36px] tracking-[4.32px]">/04</p>
    </div>
  );
}

function Col6() {
  return (
    <div className="flex-[1_0_0] h-full min-h-px min-w-px relative" data-name="Col">
      <div className="absolute content-stretch flex flex-col items-start justify-end left-0 top-[607px] w-[175px]" data-name="StepperCount/Stepper">
        <Content1 />
      </div>
    </div>
  );
}

function VideoTile3() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[450px] items-start relative shrink-0 w-[600px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08),0px_0px_24px_4px_rgba(200,29,107,0.2)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col8() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile3 />
    </div>
  );
}

function Col9() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-[191px] top-[-48px]" data-name="Col">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] opacity-80 relative shrink-0 text-[#616161] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Walk into the gym with a plan
      </p>
    </div>
  );
}

function VideoTile4() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[200px] items-start relative shrink-0 w-[400px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder1} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col10() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile4 />
    </div>
  );
}

function VideoTile5() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[200px] items-start relative shrink-0 w-[400px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder2} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col11() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile5 />
    </div>
  );
}

function Col7() {
  return (
    <div className="content-stretch flex flex-col gap-[128px] h-[975px] items-center justify-center relative shrink-0" data-name="Col">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="PrincipleTile">
        <Col8 />
        <Col9 />
      </div>
      <div className="absolute content-stretch flex gap-[10px] items-center left-[100px] opacity-60 top-[-65px]" data-name="PrincipleTile">
        <Col10 />
      </div>
      <div className="absolute content-stretch flex gap-[10px] items-center left-[100px] opacity-60 top-[840px]" data-name="PrincipleTile">
        <Col11 />
      </div>
    </div>
  );
}

function Row3() {
  return (
    <div className="content-stretch flex flex-col font-['DM_Sans:Regular',sans-serif] font-normal gap-[16px] items-end leading-[1.3] relative shrink-0 text-[#616161] text-[20px] tracking-[0.032px] uppercase whitespace-nowrap" data-name="Row">
      <p className="relative shrink-0" style={{ fontVariationSettings: "'opsz' 14" }}>
        At-home workouts
      </p>
      <p className="relative shrink-0" style={{ fontVariationSettings: "'opsz' 14" }}>{`Calm mind `}</p>
    </div>
  );
}

function Row4() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] items-end justify-center relative shrink-0" data-name="Row">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.3] opacity-80 relative shrink-0 text-[#121212] text-[24px] tracking-[0.48px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Gym Workouts
      </p>
      <div className="h-0 relative shrink-0 w-[131px]">
        <div className="absolute inset-[-2px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 131 2">
            <line id="Line 9" stroke="var(--stroke-0, #C81D6B)" strokeWidth="2" x2="131" y1="1" y2="1" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Row5() {
  return (
    <div className="content-stretch flex items-start justify-end relative shrink-0" data-name="Row">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.3] relative shrink-0 text-[#616161] text-[20px] tracking-[0.032px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Good Nutrition
      </p>
    </div>
  );
}

function PrinciplesGrid1() {
  return (
    <div className="absolute content-stretch flex gap-[24px] h-[975px] items-start justify-center left-0 px-[96px] top-[49px] w-[1440px]" data-name="Principles/Grid">
      <Col6 />
      <Col7 />
      <div className="content-stretch flex flex-[1_0_0] flex-col h-[975px] items-end justify-between min-h-px min-w-px py-[24px] relative" data-name="StepperTitles/Stepper">
        <Row3 />
        <Row4 />
        <Row5 />
      </div>
    </div>
  );
}

function BgFill1() {
  return <div className="absolute bg-[rgba(255,255,255,0.9)] h-[48px] left-0 top-0 w-[980px]" data-name="BG fill" />;
}

function Links1() {
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

function Desktop() {
  return (
    <div className="absolute bg-white h-[1024px] left-0 overflow-clip top-0 w-[1440px]" data-name="Desktop - 7">
      <PrinciplesGrid1 />
      <div className="absolute bg-[#f8f8f8] content-stretch flex h-[48px] items-center justify-between left-0 px-[96px] top-px w-[1440px]" data-name="Nav">
        <div aria-hidden="true" className="absolute border-[#e9e6e2] border-b border-solid inset-[0_0_-1px_0] pointer-events-none" />
        <BgFill1 />
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links1 />
      </div>
    </div>
  );
}

function BgFill2() {
  return <div className="absolute bg-[rgba(255,255,255,0.9)] h-[56px] left-0 top-0 w-[245px]" data-name="BG fill" />;
}

function Content2() {
  return (
    <div className="content-stretch flex gap-[8px] items-end leading-[1.15] relative shrink-0 whitespace-nowrap" data-name="Content">
      <p className="font-['Playfair_Display:Medium',sans-serif] font-medium relative shrink-0 text-[#121212] text-[64px] tracking-[7.68px]">03</p>
      <p className="font-['Playfair_Display:Regular',sans-serif] font-normal relative shrink-0 text-[#616161] text-[20px] tracking-[2.4px]">/04</p>
    </div>
  );
}

function Col12() {
  return (
    <div className="bg-white h-[94px] relative shrink-0 w-full" data-name="Col">
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex items-center justify-center p-[10px] relative size-full">
          <div className="content-stretch flex flex-col items-start relative shrink-0" data-name="StepperCount/Stepper">
            <Content2 />
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoTile6() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[467px] items-start relative shrink-0 w-[350px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.08),0px_0px_24px_4px_rgba(200,29,107,0.2)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col14() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile6 />
    </div>
  );
}

function Col15() {
  return (
    <div className="absolute content-stretch flex items-center justify-center left-[79px] top-[-48px]" data-name="Col">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] opacity-80 relative shrink-0 text-[#616161] text-[14px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Walk into the gym with a plan
      </p>
    </div>
  );
}

function VideoTile7() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[167px] items-start relative shrink-0 w-[250px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder1} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col16() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile7 />
    </div>
  );
}

function VideoTile8() {
  return (
    <div className="content-stretch flex flex-col gap-[10px] h-[167px] items-start relative shrink-0 w-[250px]" data-name="VideoTile">
      <div className="flex-[1_0_0] min-h-px min-w-px relative shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] w-full" data-name="ImagePlaceholder">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImagePlaceholder2} />
      </div>
      <div className="absolute inset-0 opacity-20" data-name="Noise">
        <div aria-hidden="true" className="absolute bg-size-[1024px_1024px] bg-top-left inset-0 mix-blend-soft-light opacity-40 pointer-events-none" style={{ backgroundImage: `url('${imgNoise}')` }} />
      </div>
      <div className="absolute bg-[#c81d6b] inset-0 mix-blend-soft-light opacity-12" data-name="ColoredScrim" />
    </div>
  );
}

function Col17() {
  return (
    <div className="content-stretch flex flex-col items-center justify-center relative shrink-0" data-name="Col">
      <VideoTile8 />
    </div>
  );
}

function Col13() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[128px] items-center justify-center min-h-px min-w-px overflow-clip relative w-full" data-name="Col">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="PrincipleTile">
        <Col14 />
        <Col15 />
      </div>
      <div className="-translate-x-1/2 absolute content-stretch flex gap-[10px] items-center left-[calc(50%+0.5px)] opacity-60 top-[-138px]" data-name="PrincipleTile">
        <Col16 />
      </div>
      <div className="-translate-x-1/2 absolute bottom-[-90px] content-stretch flex gap-[10px] items-center left-[calc(50%+0.5px)] opacity-60" data-name="PrincipleTile">
        <Col17 />
      </div>
    </div>
  );
}

function PrinciplesGrid2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] h-[796px] items-center left-0 px-[16px] top-[56px] w-[393px]" data-name="Principles/Grid">
      <Col12 />
      <Col13 />
    </div>
  );
}

function IPhone() {
  return (
    <div className="absolute bg-white h-[852px] left-0 overflow-clip top-[2756px] w-[393px]" data-name="iPhone 16 - 3">
      <div className="absolute bg-[#f8f8f8] left-0 top-0 w-[393px]" data-name="Nav">
        <div className="content-stretch flex items-center justify-between overflow-clip px-[24px] py-[16px] relative rounded-[inherit] w-full">
          <BgFill2 />
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Codepen">
            <div className="absolute inset-[8.33%]" data-name="Icon">
              <div className="absolute inset-[-6.25%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 22.5">
                  <path d={svgPaths.p3291d780} id="Icon" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          </div>
          <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - hamburgher">
            <div className="absolute inset-[20.83%_16.67%]" data-name="Vector">
              <div className="absolute inset-[-7.14%_-6.25%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 16">
                  <path d="M1 1H17M1 8H17M1 15H17" id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute border border-[#e9e6e2] border-solid inset-0 pointer-events-none" />
      </div>
      <PrinciplesGrid2 />
    </div>
  );
}

export default function Principles() {
  return (
    <div className="relative size-full" data-name="Principles">
      <IPadPro />
      <Desktop />
      <IPhone />
    </div>
  );
}