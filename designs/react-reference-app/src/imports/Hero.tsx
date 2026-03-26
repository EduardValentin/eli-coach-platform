import svgPaths from "./svg-m2vnlf9bls";
import imgDesktop1 from "figma:asset/aaea8fe9805dc4ae247ecb50912d3f16526058ae.png";

function Label() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[18px] text-white tracking-[0.18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[68px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
            <Label />
            <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - chevron right">
              <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
                <div className="absolute inset-[-8.33%_-16.67%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 14">
                    <path d="M1 13L7 7L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rail() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[calc(8.33%+82px)] overflow-clip px-[213px] py-[49px] top-[277px] w-[1036px]" data-name="Rail">
      <Content />
    </div>
  );
}

function Actions() {
  return (
    <div className="absolute content-stretch flex gap-[4px] items-center justify-end overflow-clip px-[12px] py-[4px] right-[92px] top-[970px] w-[298px]" data-name="Actions">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="-scale-y-100 flex-none">
          <div className="relative rounded-bl-[5px] rounded-br-[5px] rounded-tr-[5px] size-[32px]" data-name="Icon - pause">
            <div className="overflow-clip relative rounded-[inherit] size-full">
              <div className="absolute inset-[12.5%_20.83%]" data-name="Vector">
                <div className="absolute inset-[-4.17%_-5.36%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.6667 26">
                    <g id="Vector">
                      <path d={svgPaths.pf9c1780} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <path d={svgPaths.p202caf00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="absolute border border-[#8a38f5] border-dashed inset-0 pointer-events-none rounded-bl-[5px] rounded-br-[5px] rounded-tr-[5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Links() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0" data-name="Links">
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Link">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Free E-book
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Blog">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Blog
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="About">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          About
        </p>
      </div>
    </div>
  );
}

function Desktop() {
  return (
    <div className="absolute bg-[#fafaf7] h-[1024px] left-0 top-[2417px] w-[1440px]" data-name="Desktop - 1">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-0.04%] max-w-none top-[0.05%] w-[106.77%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[1024px] left-0 top-0 w-[1440px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <Rail />
      <Actions />
      <div className="absolute content-stretch flex h-[48px] items-center justify-between left-0 px-[96px] top-0 w-[1440px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links />
      </div>
    </div>
  );
}

function Label1() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[18px] text-white tracking-[0.18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content1() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[52px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
            <Label1 />
            <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - chevron right">
              <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
                <div className="absolute inset-[-8.33%_-16.67%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 14">
                    <path d="M1 13L7 7L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rail1() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[calc(25%+26px)] overflow-clip py-[49px] top-[541px] w-[460px]" data-name="Rail">
      <Content1 />
    </div>
  );
}

function Links1() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0" data-name="Links">
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Link">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Free E-book
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Blog">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Blog
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="About">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          About
        </p>
      </div>
    </div>
  );
}

function IPadPro() {
  return (
    <div className="absolute bg-[#fafaf7] h-[1366px] left-0 overflow-clip top-[967px] w-[1024px]" data-name="iPad Pro 12.9' - 1">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-11.5%] max-w-none top-0 w-[200.29%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[1366px] left-0 top-0 w-[1024px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <Rail1 />
      <div className="absolute content-stretch flex h-[48px] items-center justify-between left-0 overflow-clip px-[64px] top-0 w-[1024px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links1 />
      </div>
    </div>
  );
}

function Label2() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[16px] text-white tracking-[0.16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content2() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[8px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[36px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[15px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
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
        </div>
      </div>
    </div>
  );
}

function Rail2() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[17px] overflow-clip py-[69px] top-[261px] w-[359px]" data-name="Rail">
      <Content2 />
    </div>
  );
}

function IPhone() {
  return (
    <div className="absolute bg-[#fafaf7] h-[852px] left-0 overflow-clip top-0 w-[393px]" data-name="iPhone 16 - 1">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-40.95%] max-w-none top-0 w-[325.51%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[852px] left-0 top-0 w-[393px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <div className="absolute content-stretch flex items-center justify-between left-0 overflow-clip px-[24px] py-[16px] top-0 w-[393px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-6.25%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 22.5">
                <path d={svgPaths.p3291d780} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - hamburgher">
          <div className="absolute inset-[20.83%_16.67%]" data-name="Vector">
            <div className="absolute inset-[-7.14%_-6.25%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 16">
                <path d="M1 1H17M1 8H17M1 15H17" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <Rail2 />
    </div>
  );
}

function Label3() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[16px] text-white tracking-[0.16px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content3() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[8px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[36px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[15px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
            <Label3 />
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
        </div>
      </div>
    </div>
  );
}

function Rail3() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[17px] overflow-clip py-[69px] top-[261px] w-[359px]" data-name="Rail">
      <Content3 />
    </div>
  );
}

function IPhone1() {
  return (
    <div className="absolute bg-[#fafaf7] h-[852px] left-[530px] overflow-clip top-0 w-[393px]" data-name="iPhone 16 - 2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-40.95%] max-w-none top-0 w-[325.51%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[852px] left-0 top-0 w-[393px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <div className="absolute content-stretch flex items-center justify-between left-0 overflow-clip px-[24px] py-[16px] top-0 w-[393px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-6.25%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 22.5 22.5">
                <path d={svgPaths.p3291d780} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - hamburgher">
          <div className="absolute inset-[20.83%_16.67%]" data-name="Vector">
            <div className="absolute inset-[-7.14%_-6.25%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18 16">
                <path d="M1 1H17M1 8H17M1 15H17" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <Rail3 />
    </div>
  );
}

function Label4() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[18px] text-white tracking-[0.18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content4() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[52px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
            <Label4 />
            <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - chevron right">
              <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
                <div className="absolute inset-[-8.33%_-16.67%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 14">
                    <path d="M1 13L7 7L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rail4() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[calc(25%+26px)] overflow-clip py-[49px] top-[258px] w-[460px]" data-name="Rail">
      <Content4 />
    </div>
  );
}

function Links2() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0" data-name="Links">
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Link">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Free E-book
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Blog">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Blog
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="About">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          About
        </p>
      </div>
    </div>
  );
}

function IPadPro1() {
  return (
    <div className="absolute bg-[#fafaf7] h-[1366px] left-[1154px] overflow-clip top-[967px] w-[1024px]" data-name="iPad Pro 12.9' - 2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-9.88%] max-w-none top-[-21.31%] w-[200.29%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[1366px] left-0 top-0 w-[1024px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <Rail4 />
      <div className="absolute content-stretch flex h-[48px] items-center justify-between left-0 overflow-clip px-[64px] top-0 w-[1024px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links2 />
      </div>
    </div>
  );
}

function Label5() {
  return (
    <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Label">
      <p className="font-['DM_Sans:Bold',sans-serif] font-bold leading-[1.2] relative shrink-0 text-[18px] text-white tracking-[0.18px] whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
        START
      </p>
    </div>
  );
}

function Content5() {
  return (
    <div className="max-w-[896px] relative shrink-0 w-full" data-name="Content">
      <div className="flex flex-col items-center justify-center max-w-[inherit] overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col gap-[16px] items-center justify-center max-w-[inherit] p-[24px] relative w-full">
          <p className="font-['Playfair_Display:Bold',sans-serif] font-bold leading-[1.12] relative shrink-0 text-[68px] text-white whitespace-nowrap">Start training</p>
          <p className="font-['DM_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
            Stronger body, calmer mind, happier life.
          </p>
          <div className="bg-[#c81d6b] content-stretch flex gap-[4px] items-center justify-center overflow-clip px-[24px] py-[12px] relative shrink-0" data-name="CTA">
            <Label5 />
            <div className="overflow-clip relative shrink-0 size-[24px]" data-name="Icon - chevron right">
              <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
                <div className="absolute inset-[-8.33%_-16.67%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 14">
                    <path d="M1 13L7 7L1 1" id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Rail5() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[calc(8.33%+82px)] overflow-clip px-[213px] py-[49px] top-[69px] w-[1036px]" data-name="Rail">
      <Content5 />
    </div>
  );
}

function Actions1() {
  return (
    <div className="absolute content-stretch flex gap-[4px] items-center justify-end overflow-clip px-[12px] py-[4px] right-[92px] top-[970px] w-[298px]" data-name="Actions">
      <div className="flex items-center justify-center relative shrink-0">
        <div className="-scale-y-100 flex-none">
          <div className="relative rounded-bl-[5px] rounded-br-[5px] rounded-tr-[5px] size-[32px]" data-name="Icon - pause">
            <div className="overflow-clip relative rounded-[inherit] size-full">
              <div className="absolute inset-[12.5%_20.83%]" data-name="Vector">
                <div className="absolute inset-[-4.17%_-5.36%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.6667 26">
                    <g id="Vector">
                      <path d={svgPaths.pf9c1780} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      <path d={svgPaths.p202caf00} stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="absolute border border-[#8a38f5] border-dashed inset-0 pointer-events-none rounded-bl-[5px] rounded-br-[5px] rounded-tr-[5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Links3() {
  return (
    <div className="content-stretch flex gap-[24px] h-full items-center justify-end relative shrink-0" data-name="Links">
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Link">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Free E-book
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="Blog">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          Blog
        </p>
      </div>
      <div className="content-stretch flex items-center justify-center relative shrink-0" data-name="About">
        <p className="font-['DM_Sans:Medium',sans-serif] font-medium leading-[1.25] relative shrink-0 text-[16px] text-white whitespace-nowrap" style={{ fontVariationSettings: "'opsz' 14" }}>
          About
        </p>
      </div>
    </div>
  );
}

function Desktop1() {
  return (
    <div className="absolute bg-[#fafaf7] h-[1024px] left-[1540px] top-[2417px] w-[1440px]" data-name="Desktop - 2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img alt="" className="absolute h-full left-[-0.04%] max-w-none top-[-21.93%] w-[106.77%]" src={imgDesktop1} />
      </div>
      <div className="absolute h-[1024px] left-0 top-0 w-[1440px]" data-name="Overlay" style={{ backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.56) 0%, rgba(0, 0, 0, 0.32) 40%, rgba(0, 0, 0, 0.14) 70%, rgba(0, 0, 0, 0) 100%)" }} />
      <Rail5 />
      <Actions1 />
      <div className="absolute content-stretch flex h-[48px] items-center justify-between left-0 px-[96px] top-0 w-[1440px]" data-name="Nav">
        <div className="overflow-clip relative shrink-0 size-[32px]" data-name="Codepen">
          <div className="absolute inset-[8.33%]" data-name="Icon">
            <div className="absolute inset-[-5.62%]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 29.6667 29.6667">
                <path d={svgPaths.p21283000} id="Icon" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </div>
        <Links3 />
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="relative size-full" data-name="Hero">
      <Desktop />
      <IPadPro />
      <IPhone />
      <IPhone1 />
      <IPadPro1 />
      <Desktop1 />
    </div>
  );
}