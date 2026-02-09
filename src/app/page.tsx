export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[var(--color-primary)] overflow-hidden">

      {/* Hero content */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-[3vw] pt-20">
        <h1
          className="font-heading font-semibold text-white leading-[1]"
          style={{ fontSize: "clamp(40px, 7.8vw, 150px)" }}
        >
          <span className="flex items-center reveal">
            이데아의 첫
            <span className="inline-block w-[2.8em] h-[2px] bg-white mx-[0.3em] flex-shrink-0" />
            번째
          </span>
          <br />
          <span className="reveal reveal-delay-2 inline-block">프로젝트</span>
          <br />
          <span className="font-bold reveal reveal-delay-3 inline-block">DODAM</span>
        </h1>
      </div>

      {/* Logo circles - decorative */}
      <div className="absolute right-[-5%] top-[36%] z-0 reveal-fade reveal-delay-4">
        <svg
          viewBox="0 0 852 852"
          fill="none"
          className="w-[44vw] h-[44vw] max-w-[852px] max-h-[852px]"
        >
          <ellipse cx="284" cy="426" rx="284" ry="284" stroke="white" strokeWidth="2" fill="none" />
          <ellipse cx="568" cy="426" rx="284" ry="284" stroke="white" strokeWidth="2" fill="none" />
          <ellipse cx="426" cy="568" rx="284" ry="284" stroke="white" strokeWidth="2" fill="none" />
          <ellipse cx="426" cy="284" rx="284" ry="284" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>
    </div>
  );
}
