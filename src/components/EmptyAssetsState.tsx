import cursorCube from "../assets/cursor-cube.png";

interface EmptyAssetsStateProps {
  subtitle?: string;
}

export function EmptyAssetsState({ subtitle }: EmptyAssetsStateProps) {
  return (
    <section className="flex flex-col items-center justify-center py-24 text-center">
      <img
        src={cursorCube}
        alt=""
        aria-hidden="true"
        className="h-20 w-20 opacity-35"
      />
      <p className="mt-6 text-[15px] font-medium text-[#8a8a8a]">No assets found</p>
      {subtitle ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#a3a3a3]">{subtitle}</p>
      ) : null}
    </section>
  );
}
