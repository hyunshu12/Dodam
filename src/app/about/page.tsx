export default function AboutPage() {
  return (
    <div className="w-full">
      {/* Section 1: Team - idea (목업용 화면2) */}
      <section className="relative w-full min-h-screen bg-[var(--color-primary)] overflow-hidden">

        <div className="flex flex-col items-center justify-center min-h-screen px-10 pt-20">
          {/* Logo circles */}
          <div className="mb-6 reveal-scale">
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none">
              <circle cx="80" cy="120" r="78" stroke="white" strokeWidth="2" fill="none" />
              <circle cx="160" cy="120" r="78" stroke="white" strokeWidth="2" fill="none" />
              <circle cx="120" cy="80" r="78" stroke="white" strokeWidth="2" fill="none" />
              <circle cx="120" cy="160" r="78" stroke="white" strokeWidth="2" fill="none" />
            </svg>
          </div>

          {/* Divider line */}
          <div className="w-px h-20 bg-white mb-8 reveal reveal-delay-1" />

          {/* Team name */}
          <h2
            className="font-heading font-semibold text-white text-center mb-12 reveal reveal-delay-2"
            style={{ fontSize: "clamp(40px, 5vw, 77px)" }}
          >
            idea
          </h2>

          {/* Description */}
          <p className="font-heading font-semibold text-white text-center text-[clamp(16px,1.25vw,24px)] leading-[2.5] w-[70%] max-w-[1352px] reveal reveal-delay-3">
            idea(이데아)는 플라톤의 철학에서 완전한 이상의 형태를 의미하는 단어입니다.
            <br />
            이러한 팀명의 의미처럼 저희는 현실 세상 속에서 변하지 않을 본질적 가치를 찾고 그 본질적 가치를 실현하는 IT 창업팀입니다.
            <br />
            저희의 모든 프로젝트는 &apos;본질적 가치&apos;에서 출발합니다. 모든 문제의 해결은 단순한 기술의 집약체가 아니라
            <br />
            철학과 비전이 함께 할 때 비로소 해결된다고 생각합니다.
            <br />
            &apos;본질을 잇고, 가치를 완성한다.&apos; 이것이 바로 이데아가 내세우는 비전이자 이데아의 존재 이유입니다.
          </p>
        </div>
      </section>

      {/* Section 2: DODAM (목업용 화면3) */}
      <section className="relative w-full min-h-screen bg-[var(--color-primary)] overflow-hidden flex flex-col items-center justify-center px-10">
        {/* App Logo (Figma 앱 로고) */}
        <div className="mb-12 reveal-scale">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/dodam-logo.svg"
            alt="DODAM - Always Connected"
            width={400}
            height={400}
            className="w-[200px] h-[200px] md:w-[300px] md:h-[300px]"
          />
        </div>

        {/* Description */}
        <p className="font-heading font-bold text-white text-center text-[clamp(16px,1.25vw,24px)] leading-[2.5] w-[70%] max-w-[1352px] reveal reveal-delay-2">
          DODAM은 위기 상황에서 피해자와 보호자를 잇는 긴급 연결 플랫폼입니다.
          <br />
          저희 이데아는 최근 발생한 캄보디아 한국인 납치사건에 주목하였습니다.
          <br />
          이 과정에서 저희는 위기상황 발생시 피해자와 보호자를 이어주는 연락망의 부재를 문제로 인식하였고,
          <br />
          이를 해결하기 위해 DODAM을 기획하였습니다.
          <br />
          DODAM은 가장 필요한 순간, 가장 필요한 연결이 이어질수 있게 합니다.
        </p>
      </section>
    </div>
  );
}
