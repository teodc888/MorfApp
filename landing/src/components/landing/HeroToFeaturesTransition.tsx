export function HeroToFeaturesTransition() {
  return (
    <section
      className="relative h-0 overflow-hidden bg-[#f6f0e8]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#faf5ee_0%,#f9f2ea_34%,#fbe8d8_66%,#f6f0e8_100%)]" />
      <div className="absolute inset-x-[-8%] top-[-32%] h-[82%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(224,136,80,0.24)_0%,rgba(194,101,42,0.12)_42%,rgba(246,240,232,0)_72%)] blur-md" />
      <div className="absolute inset-0 opacity-[0.14] mix-blend-multiply transition-noise" />
      <div className="absolute left-1/2 top-[34%] h-px w-[66%] -translate-x-1/2 bg-[linear-gradient(90deg,rgba(246,240,232,0),rgba(212,169,106,0.42),rgba(246,240,232,0))]" />
      <div className="absolute inset-x-0 bottom-[-1px] h-20 bg-[#f6f0e8] [clip-path:ellipse(86%_72%_at_50%_100%)] md:h-24" />

      <style>{`
        .transition-noise {
          background-image:
            radial-gradient(circle at 20% 30%, rgba(250,245,238,0.32) 0 1px, transparent 1px),
            radial-gradient(circle at 70% 65%, rgba(194,101,42,0.18) 0 1px, transparent 1px);
          background-size: 18px 18px, 23px 23px;
          animation: transitionSheen 9s ease-in-out infinite;
        }

        @keyframes transitionSheen {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.14; }
          50% { transform: translate3d(0, -8px, 0); opacity: 0.22; }
        }

        @media (prefers-reduced-motion: reduce) {
          .transition-noise {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
