import svgPaths from "./svg-c4pcigjwpc";
import imgPhoto from "figma:asset/0aa88bab64c42d1ac63e87ac3f8e6c66e84ae96f.png";
import imgMedia from "figma:asset/5c83adc7b7c0b434dc3345f3a48ae6870fe00b2d.png";
import imgAvatar from "figma:asset/d67ff0d1c512da8a24b5df3159e4e6886bbfd634.png";
import imgPhoto1 from "figma:asset/6d4d5e86421e89b07baf3b9ecfe121957676ebb2.png";
import imgPhoto2 from "figma:asset/fc14474973df935284c0f7b4b9eb7be36756906e.png";
import imgAvatar1 from "figma:asset/dce94a79f20f749e08e9545104460da7c171bd7a.png";

function LucideShieldCheck() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/shield-check">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/shield-check">
          <path d={svgPaths.p5d73600} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideShieldCheck />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[15px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        IFFB-Certified
      </p>
    </div>
  );
}

function LucideVenus() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/venus">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/venus">
          <path d={svgPaths.pb11d8c0} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideVenus />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[15px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Women-focused
      </p>
    </div>
  );
}

function LucideLaugh() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/laugh">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_930)" id="lucide/laugh">
          <path d={svgPaths.p35410d00} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_930">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function TrustItem2() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideLaugh />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[15px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Happy-clients
      </p>
    </div>
  );
}

function TrustRail() {
  return (
    <div className="content-center flex flex-wrap gap-[10px] items-center overflow-clip relative shrink-0 w-full" data-name="Trust Rail">
      <TrustItem />
      <TrustItem1 />
      <TrustItem2 />
    </div>
  );
}

function Label() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[16px] text-white tracking-[0.16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Start my plan
      </p>
    </div>
  );
}

function CtaRail() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="CTA Rail">
      <div className="bg-[#c81d6b] content-stretch flex gap-[8px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
        <Label />
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Icon - chevron right">
          <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
            <div className="absolute inset-[-10%_-20%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 12">
                <path d="M1 11L6 6L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="decoration-solid font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[15px] underline whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        See pricing
      </p>
    </div>
  );
}

function Bio() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="Bio">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.2] relative shrink-0 text-[#121212] text-[12px] tracking-[0.24px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        PERSONAL TRAINER • VIRTUAL SESSIONS
      </p>
      <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.15] relative shrink-0 text-[#121212] text-[28px] whitespace-nowrap">Meet Eli</p>
      <div className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#121212] text-[15px] w-[min-content] whitespace-pre-wrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        <p className="mb-0">{`I help busy women feel strong, confident, and pain-free—without the gym. I’m ACE-certified with 7+ years coaching and 400+ client programs delivered entirely online. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p className="mb-0">{`My sessions are short, personalized, and fit around your schedule; all you need is a mat, a kettlebell, and 30 minutes. Whether you’re rebuilding after a break, training around a busy job, or chasing a first pull-up, I’ll guide you step-by-step with clear form videos and weekly check-ins. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p>Ready to start? Let’s build a plan you can actually stick to</p>
      </div>
      <TrustRail />
      <CtaRail />
    </div>
  );
}

function Left() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-center overflow-clip relative shrink-0 w-full" data-name="Left">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Stories">
        <div className="absolute left-[-49.5px] size-[360px] top-[-50px]" data-name="Halo">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 360 360">
            <circle cx="180" cy="180" fill="url(#paint0_radial_1_901)" id="Halo" r="180" />
            <defs>
              <radialGradient cx="0" cy="0" gradientTransform="translate(180 180) rotate(90) scale(180)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_901" r="1">
                <stop offset="0.5" stopColor="#F7DDE6" />
                <stop offset="1" stopColor="#F7DDE6" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
        <div className="relative shrink-0 size-[260px]" data-name="Photo">
          <div className="absolute inset-[-6.15%_-9.23%_-12.31%_-9.23%]">
            <img alt="" className="block max-w-none size-full" height="308" src={imgPhoto} width="308" />
          </div>
        </div>
      </div>
      <Bio />
    </div>
  );
}

function Progress() {
  return (
    <div className="relative shrink-0 w-full" data-name="Progress">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[4px] items-start pt-[8px] px-[8px] relative w-full">
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[16px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserText() {
  return (
    <div className="content-stretch flex gap-[16px] items-center overflow-clip p-[10px] relative shrink-0 text-white whitespace-nowrap" data-name="User/Text">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] relative shrink-0 text-[16px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        elilungu_
      </p>
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] opacity-70 relative shrink-0 text-[12px] tracking-[0.12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        24m
      </p>
    </div>
  );
}

function Left1() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Left">
      <div className="relative shrink-0 size-[28px]" data-name="Avatar">
        <img alt="" className="absolute block max-w-none size-full" height="28" src={imgAvatar} width="28" />
      </div>
      <UserText />
    </div>
  );
}

function LucidePause() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/pause">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/pause">
          <g id="Vector">
            <path d={svgPaths.p21e43200} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
            <path d={svgPaths.p3a5d1d00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function LucideVolume() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/volume">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/volume">
          <path d={svgPaths.p2f460780} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Actions() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-end relative shrink-0" data-name="Actions">
      <LucidePause />
      <LucideVolume />
    </div>
  );
}

function Header() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between p-[8px] relative w-full">
          <Left1 />
          <Actions />
        </div>
      </div>
    </div>
  );
}

function HudTop() {
  return (
    <div className="absolute bg-gradient-to-b content-stretch flex flex-col from-[rgba(0,0,0,0.56)] gap-[10px] items-start left-0 overflow-clip to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.24)] w-[300px]" data-name="Hud/Top">
      <Progress />
      <Header />
    </div>
  );
}

function InputPill() {
  return (
    <div className="bg-[rgba(255,255,255,0.16)] flex-[1_0_0] h-[38px] min-h-px min-w-px relative rounded-[999px]" data-name="Input Pill">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center px-[16px] py-[12px] relative size-full">
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] relative shrink-0 text-[12px] text-white tracking-[0.12px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Send a message...
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.26)] border-solid inset-0 pointer-events-none rounded-[999px]" />
    </div>
  );
}

function LucideSend() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/send">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/send">
          <path d={svgPaths.p13836a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function LucideHeart() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/heart">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/heart">
          <path d={svgPaths.pda9d200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function MessageBar() {
  return (
    <div className="h-[62px] relative shrink-0 w-full" data-name="Message Bar">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative size-full">
          <InputPill />
          <LucideSend />
          <LucideHeart />
        </div>
      </div>
    </div>
  );
}

function HudBottom() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip px-[10px] py-[6px] top-[486px] w-[300px]" data-name="Hud/Bottom">
      <MessageBar />
    </div>
  );
}

function Right() {
  return (
    <div className="content-stretch flex h-[596px] items-center justify-center py-[24px] relative shrink-0 w-full" data-name="Right">
      <div className="bg-[#121212] h-[560px] overflow-clip relative rounded-[20px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] shrink-0 w-[300px]" data-name="Stories">
        <div className="absolute h-[560px] left-0 top-0 w-[300px]" data-name="Media">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMedia} />
        </div>
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0.31)] h-[200px] left-0 to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.13)] w-[300px]" data-name="Scrim/Top" />
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0)] h-[201px] left-0 to-[rgba(0,0,0,0.56)] top-[359px] via-[40%] via-[rgba(0,0,0,0.24)] w-[300px]" data-name="Scrim/Bottom" />
        <HudTop />
        <HudBottom />
      </div>
    </div>
  );
}

function Content() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[32px] h-[1500px] items-start left-[23px] py-[24px] top-[56px] w-[354px]" data-name="Content">
      <Left />
      <Right />
    </div>
  );
}

function BgFill() {
  return <div className="absolute bg-[rgba(255,255,255,0.9)] h-[56px] left-0 top-0 w-[245px]" data-name="BG fill" />;
}

function IPadPro() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#fafaf7] h-[1578px] left-0 overflow-clip top-[calc(50%+1392.5px)] w-[393px]" data-name="iPad Pro 12.9'">
      <Content />
      <div className="absolute bg-[#f8f8f8] left-0 top-0 w-[393px]" data-name="Nav">
        <div className="content-stretch flex items-center justify-between overflow-clip px-[24px] py-[16px] relative rounded-[inherit] w-full">
          <BgFill />
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
    </div>
  );
}

function LucideShieldCheck1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/shield-check">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/shield-check">
          <path d={svgPaths.p5d73600} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem3() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideShieldCheck1 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        IFFB-Certified
      </p>
    </div>
  );
}

function LucideVenus1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/venus">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/venus">
          <path d={svgPaths.pb11d8c0} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem4() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideVenus1 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Women-focused
      </p>
    </div>
  );
}

function LucideLaugh1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/laugh">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_930)" id="lucide/laugh">
          <path d={svgPaths.p35410d00} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_930">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function TrustItem5() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideLaugh1 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Happy-clients
      </p>
    </div>
  );
}

function TrustRail1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center overflow-clip relative shrink-0 w-full" data-name="Trust Rail">
      <TrustItem3 />
      <TrustItem4 />
      <TrustItem5 />
    </div>
  );
}

function Label1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[16px] text-white tracking-[0.16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Start my plan
      </p>
    </div>
  );
}

function CtaRail1() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="CTA Rail">
      <div className="bg-[#c81d6b] content-stretch flex gap-[8px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
        <Label1 />
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Icon - chevron right">
          <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
            <div className="absolute inset-[-10%_-20%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 12">
                <path d="M1 11L6 6L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="decoration-solid font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[16px] underline whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        See pricing
      </p>
    </div>
  );
}

function Bio1() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="Bio">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.2] relative shrink-0 text-[#121212] text-[14px] tracking-[0.28px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        PERSONAL TRAINER • VIRTUAL SESSIONS
      </p>
      <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.15] relative shrink-0 text-[#121212] text-[32px] whitespace-nowrap">Meet Eli</p>
      <div className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#121212] text-[16px] w-[min-content] whitespace-pre-wrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        <p className="mb-0">{`I help busy women feel strong, confident, and pain-free—without the gym. I’m ACE-certified with 7+ years coaching and 400+ client programs delivered entirely online. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p className="mb-0">{`My sessions are short, personalized, and fit around your schedule; all you need is a mat, a kettlebell, and 30 minutes. Whether you’re rebuilding after a break, training around a busy job, or chasing a first pull-up, I’ll guide you step-by-step with clear form videos and weekly check-ins. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p>Ready to start? Let’s build a plan you can actually stick to</p>
      </div>
      <TrustRail1 />
      <CtaRail1 />
    </div>
  );
}

function Left2() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] h-[1270px] items-center justify-center overflow-clip relative shrink-0 w-[460px]" data-name="Left">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Stories">
        <div className="absolute left-[-49.5px] size-[380px] top-[-50px]" data-name="Halo">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 380 380">
            <circle cx="190" cy="190" fill="url(#paint0_radial_1_907)" id="Halo" r="190" />
            <defs>
              <radialGradient cx="0" cy="0" gradientTransform="translate(190 190) rotate(90) scale(190)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_907" r="1">
                <stop offset="0.5" stopColor="#F7DDE6" />
                <stop offset="1" stopColor="#F7DDE6" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
        <div className="relative shrink-0 size-[280px]" data-name="Photo">
          <div className="absolute inset-[-5.71%_-8.57%_-11.43%_-8.57%]">
            <img alt="" className="block max-w-none size-full" height="328" src={imgPhoto1} width="328" />
          </div>
        </div>
      </div>
      <Bio1 />
    </div>
  );
}

function Progress1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Progress">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[4px] items-start pt-[8px] px-[8px] relative w-full">
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[16px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserText1() {
  return (
    <div className="content-stretch flex gap-[16px] items-center overflow-clip p-[10px] relative shrink-0 text-white whitespace-nowrap" data-name="User/Text">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] relative shrink-0 text-[16px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        elilungu_
      </p>
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] opacity-70 relative shrink-0 text-[12px] tracking-[0.12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        24m
      </p>
    </div>
  );
}

function Left3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Left">
      <div className="relative shrink-0 size-[28px]" data-name="Avatar">
        <img alt="" className="absolute block max-w-none size-full" height="28" src={imgAvatar} width="28" />
      </div>
      <UserText1 />
    </div>
  );
}

function LucidePause1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/pause">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/pause">
          <g id="Vector">
            <path d={svgPaths.p21e43200} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
            <path d={svgPaths.p3a5d1d00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function LucideVolume1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/volume">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/volume">
          <path d={svgPaths.p2f460780} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Actions1() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-end relative shrink-0" data-name="Actions">
      <LucidePause1 />
      <LucideVolume1 />
    </div>
  );
}

function Header1() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between p-[8px] relative w-full">
          <Left3 />
          <Actions1 />
        </div>
      </div>
    </div>
  );
}

function HudTop1() {
  return (
    <div className="absolute bg-gradient-to-b content-stretch flex flex-col from-[rgba(0,0,0,0.56)] gap-[10px] items-start left-0 overflow-clip to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.24)] w-[340px]" data-name="Hud/Top">
      <Progress1 />
      <Header1 />
    </div>
  );
}

function InputPill1() {
  return (
    <div className="bg-[rgba(255,255,255,0.16)] flex-[1_0_0] h-[38px] min-h-px min-w-px relative rounded-[999px]" data-name="Input Pill">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center px-[16px] py-[12px] relative size-full">
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] relative shrink-0 text-[12px] text-white tracking-[0.12px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Send a message...
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.26)] border-solid inset-0 pointer-events-none rounded-[999px]" />
    </div>
  );
}

function LucideSend1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/send">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/send">
          <path d={svgPaths.p13836a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function LucideHeart1() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/heart">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/heart">
          <path d={svgPaths.pda9d200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function MessageBar1() {
  return (
    <div className="h-[62px] relative shrink-0 w-full" data-name="Message Bar">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative size-full">
          <InputPill1 />
          <LucideSend1 />
          <LucideHeart1 />
        </div>
      </div>
    </div>
  );
}

function HudBottom1() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip px-[10px] py-[6px] top-[566px] w-[340px]" data-name="Hud/Bottom">
      <MessageBar1 />
    </div>
  );
}

function Right1() {
  return (
    <div className="content-stretch flex h-[1270px] items-center justify-center py-[24px] relative shrink-0 w-[339px]" data-name="Right">
      <div className="bg-[#121212] h-[640px] overflow-clip relative rounded-[22px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] shrink-0 w-[340px]" data-name="Stories">
        <div className="absolute h-[640px] left-0 top-0 w-[340px]" data-name="Media">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMedia} />
        </div>
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0.31)] h-[180px] left-0 to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.13)] w-[340px]" data-name="Scrim/Top" />
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0)] h-[180px] left-0 to-[rgba(0,0,0,0.56)] top-[460px] via-[40%] via-[rgba(0,0,0,0.24)] w-[340px]" data-name="Scrim/Bottom" />
        <HudTop1 />
        <HudBottom1 />
      </div>
    </div>
  );
}

function Content1() {
  return (
    <div className="absolute content-stretch flex h-[1318px] items-start justify-between left-[40px] py-[24px] top-[48px] w-[944px]" data-name="Content">
      <Left2 />
      <Right1 />
    </div>
  );
}

function BgFill1() {
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

function IPadPro1() {
  return (
    <div className="-translate-y-1/2 absolute bg-[#fafaf7] h-[1366px] left-0 overflow-clip top-[calc(50%-245.5px)] w-[1024px]" data-name="iPad Pro 12.9'">
      <Content1 />
      <div className="absolute bg-[#f8f8f8] h-[48px] left-0 top-0 w-[1024px]" data-name="Nav">
        <div className="content-stretch flex items-center justify-between overflow-clip px-[64px] relative rounded-[inherit] size-full">
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
          <Links />
        </div>
        <div aria-hidden="true" className="absolute border-[#e9e6e2] border-b border-solid inset-0 pointer-events-none" />
      </div>
    </div>
  );
}

function LucideShieldCheck2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/shield-check">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/shield-check">
          <path d={svgPaths.p5d73600} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem6() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideShieldCheck2 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        IFFB-Certified
      </p>
    </div>
  );
}

function LucideVenus2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/venus">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="lucide/venus">
          <path d={svgPaths.pb11d8c0} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

function TrustItem7() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideVenus2 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Women-focused
      </p>
    </div>
  );
}

function LucideLaugh2() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="lucide/laugh">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g clipPath="url(#clip0_1_930)" id="lucide/laugh">
          <path d={svgPaths.p35410d00} id="Vector" stroke="var(--stroke-0, #121212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </g>
        <defs>
          <clipPath id="clip0_1_930">
            <rect fill="white" height="16" width="16" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function TrustItem8() {
  return (
    <div className="content-stretch flex gap-[10px] items-center justify-center relative shrink-0" data-name="Trust Item">
      <LucideLaugh2 />
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Happy-clients
      </p>
    </div>
  );
}

function TrustRail2() {
  return (
    <div className="content-stretch flex gap-[10px] items-center overflow-clip relative shrink-0 w-full" data-name="Trust Rail">
      <TrustItem6 />
      <TrustItem7 />
      <TrustItem8 />
    </div>
  );
}

function Label2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[16px] text-white tracking-[0.16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        Start my plan
      </p>
    </div>
  );
}

function CtaRail2() {
  return (
    <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="CTA Rail">
      <div className="bg-[#c81d6b] content-stretch flex gap-[8px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
        <Label2 />
        <div className="overflow-clip relative shrink-0 size-[20px]" data-name="Icon - chevron right">
          <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
            <div className="absolute inset-[-10%_-20%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 7 12">
                <path d="M1 11L6 6L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <p className="decoration-solid font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[#121212] text-[18px] underline whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        See pricing
      </p>
    </div>
  );
}

function Bio2() {
  return (
    <div className="content-stretch flex flex-col gap-[16px] items-start overflow-clip relative shrink-0 w-full" data-name="Bio">
      <p className="font-['DM_Sans:SemiBold',sans-serif] font-semibold leading-[1.2] relative shrink-0 text-[#121212] text-[14px] tracking-[0.28px] uppercase whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        PERSONAL TRAINER • VIRTUAL SESSIONS
      </p>
      <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.15] relative shrink-0 text-[#121212] text-[40px] whitespace-nowrap">Meet Eli</p>
      <div className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] min-w-full relative shrink-0 text-[#121212] text-[18px] w-[min-content] whitespace-pre-wrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        <p className="mb-0">{`I help busy women feel strong, confident, and pain-free—without the gym. I’m ACE-certified with 7+ years coaching and 400+ client programs delivered entirely online. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p className="mb-0">{`My sessions are short, personalized, and fit around your schedule; all you need is a mat, a kettlebell, and 30 minutes. Whether you’re rebuilding after a break, training around a busy job, or chasing a first pull-up, I’ll guide you step-by-step with clear form videos and weekly check-ins. `}</p>
        <p className="mb-0">&nbsp;</p>
        <p>Ready to start? Let’s build a plan you can actually stick to</p>
      </div>
      <TrustRail2 />
      <CtaRail2 />
    </div>
  );
}

function Left4() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] h-[928px] items-center justify-center overflow-clip relative shrink-0 w-[612px]" data-name="Left">
      <div className="content-stretch flex gap-[10px] items-center relative shrink-0" data-name="Stories">
        <div className="absolute left-[-49.5px] size-[420px] top-[-50px]" data-name="Halo">
          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 420 420">
            <circle cx="210" cy="210" fill="url(#paint0_radial_1_905)" id="Halo" r="210" />
            <defs>
              <radialGradient cx="0" cy="0" gradientTransform="translate(210 210) rotate(90) scale(210)" gradientUnits="userSpaceOnUse" id="paint0_radial_1_905" r="1">
                <stop offset="0.5" stopColor="#F7DDE6" />
                <stop offset="1" stopColor="#F7DDE6" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
        <div className="relative shrink-0 size-[320px]" data-name="Photo">
          <div className="absolute inset-[-5%_-7.5%_-10%_-7.5%]">
            <img alt="" className="block max-w-none size-full" height="368" src={imgPhoto2} width="368" />
          </div>
        </div>
      </div>
      <Bio2 />
    </div>
  );
}

function Progress2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Progress">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[4px] items-start pt-[8px] px-[8px] relative w-full">
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-[16px]" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
          <div className="content-stretch flex gap-[4px] h-[2px] items-center relative shrink-0 w-[35px]" data-name="Progress Bar">
            <div className="absolute bg-white h-[2px] left-0 rounded-[1px] top-0 w-0" data-name="Background" />
            <div className="absolute bg-[rgba(255,255,255,0.32)] h-[2px] left-0 rounded-[1px] top-0 w-[35px]" data-name="Foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserText2() {
  return (
    <div className="content-stretch flex gap-[16px] items-center overflow-clip p-[10px] relative shrink-0 text-white whitespace-nowrap" data-name="User/Text">
      <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.45] relative shrink-0 text-[16px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        elilungu_
      </p>
      <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] opacity-70 relative shrink-0 text-[12px] tracking-[0.12px]" style={{ fontVariationSettings: "'opsz' 14" }}>
        24m
      </p>
    </div>
  );
}

function Left5() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0" data-name="Left">
      <div className="relative shrink-0 size-[32px]" data-name="Avatar">
        <img alt="" className="absolute block max-w-none size-full" height="32" src={imgAvatar1} width="32" />
      </div>
      <UserText2 />
    </div>
  );
}

function LucidePause2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/pause">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/pause">
          <g id="Vector">
            <path d={svgPaths.p21e43200} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
            <path d={svgPaths.p3a5d1d00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function LucideVolume2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/volume">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/volume">
          <path d={svgPaths.p2f460780} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function Actions2() {
  return (
    <div className="content-stretch flex gap-[12px] items-center justify-end relative shrink-0" data-name="Actions">
      <LucidePause2 />
      <LucideVolume2 />
    </div>
  );
}

function Header2() {
  return (
    <div className="relative shrink-0 w-full" data-name="Header">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-between p-[8px] relative w-full">
          <Left5 />
          <Actions2 />
        </div>
      </div>
    </div>
  );
}

function HudTop2() {
  return (
    <div className="absolute bg-gradient-to-b content-stretch flex flex-col from-[rgba(0,0,0,0.56)] gap-[10px] items-start left-0 overflow-clip to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.24)] w-[382px]" data-name="Hud/Top">
      <Progress2 />
      <Header2 />
    </div>
  );
}

function InputPill2() {
  return (
    <div className="bg-[rgba(255,255,255,0.16)] flex-[1_0_0] h-[38px] min-h-px min-w-px relative rounded-[999px]" data-name="Input Pill">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center px-[16px] py-[12px] relative size-full">
          <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.3] relative shrink-0 text-[12px] text-white tracking-[0.12px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Send a message...
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="absolute border border-[rgba(255,255,255,0.26)] border-solid inset-0 pointer-events-none rounded-[999px]" />
    </div>
  );
}

function LucideSend2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/send">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/send">
          <path d={svgPaths.p13836a00} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function LucideHeart2() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="lucide/heart">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="lucide/heart">
          <path d={svgPaths.pda9d200} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}

function MessageBar2() {
  return (
    <div className="h-[62px] relative shrink-0 w-full" data-name="Message Bar">
      <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex gap-[8px] items-center p-[8px] relative size-full">
          <InputPill2 />
          <LucideSend2 />
          <LucideHeart2 />
        </div>
      </div>
    </div>
  );
}

function HudBottom2() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-0 overflow-clip px-[10px] py-[6px] top-[686px] w-[390px]" data-name="Hud/Bottom">
      <MessageBar2 />
    </div>
  );
}

function Right2() {
  return (
    <div className="content-stretch flex h-[928px] items-center justify-center relative shrink-0 w-[400px]" data-name="Right">
      <div className="bg-[#121212] h-[760px] overflow-clip relative rounded-[24px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)] shrink-0 w-[390px]" data-name="Stories">
        <div className="absolute h-[760px] left-0 top-0 w-[390px]" data-name="Media">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgMedia} />
        </div>
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0.31)] h-[200px] left-0 to-[rgba(0,0,0,0)] top-0 via-[60%] via-[rgba(0,0,0,0.13)] w-[390px]" data-name="Scrim/Top" />
        <div className="absolute bg-gradient-to-b from-[rgba(0,0,0,0)] h-[200px] left-0 to-[rgba(0,0,0,0.56)] top-[560px] via-[40%] via-[rgba(0,0,0,0.24)] w-[390px]" data-name="Scrim/Bottom" />
        <HudTop2 />
        <HudBottom2 />
      </div>
    </div>
  );
}

function Content2() {
  return (
    <div className="absolute content-stretch flex h-[976px] items-start justify-between left-[calc(8.33%+82px)] py-[24px] top-[48px] w-[1036px]" data-name="Content">
      <Left4 />
      <Right2 />
    </div>
  );
}

function BgFill2() {
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
    <div className="-translate-y-1/2 absolute bg-[#fafaf7] h-[1024px] left-0 overflow-clip top-[calc(50%-1669.5px)] w-[1440px]" data-name="Desktop - 2">
      <Content2 />
      <div className="absolute bg-[#f8f8f8] content-stretch flex h-[48px] items-center justify-between left-0 px-[96px] top-0 w-[1440px]" data-name="Nav">
        <div aria-hidden="true" className="absolute border-[#e9e6e2] border-b border-solid inset-[0_0_-1px_0] pointer-events-none" />
        <BgFill2 />
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

export default function About() {
  return (
    <div className="relative size-full" data-name="About">
      <IPadPro />
      <IPadPro1 />
      <Desktop />
    </div>
  );
}