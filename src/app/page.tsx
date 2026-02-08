import Navbar from "@/components/ui/Navbar";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen bg-[var(--color-primary)] overflow-hidden">
      <Navbar variant="transparent" />

      {/* Hero content */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-10 pt-20">
        <h1
          className="font-heading font-semibold text-white leading-[1]"
          style={{ fontSize: "clamp(60px, 10vw, 150px)" }}
        >
          이데아의 첫{" "}
          <span className="inline-block ml-[2em]">
            {" "}
            <span className="inline-block border-b-2 border-white pb-1">
              번째
            </span>
          </span>
          <br />
          <br />
          프로젝트
          <br />
          <span className="font-bold">DODAM</span>
        </h1>
      </div>

      {/* Logo circles - decorative */}
      <div className="absolute right-[5%] top-[35%] z-0 opacity-60">
        <svg
          width="500"
          height="500"
          viewBox="0 0 500 500"
          fill="none"
          className="w-[30vw] h-[30vw] max-w-[500px] max-h-[500px]"
        >
          <circle
            cx="170"
            cy="250"
            r="160"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="330"
            cy="250"
            r="160"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="250"
            cy="170"
            r="160"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="250"
            cy="330"
            r="160"
            stroke="white"
            strokeWidth="2"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
}
