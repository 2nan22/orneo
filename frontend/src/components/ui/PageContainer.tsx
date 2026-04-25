interface PageContainerProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "max-w-xl",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

export default function PageContainer({
  children,
  size = "md",
  className = "",
}: PageContainerProps) {
  return (
    <div
      className={[
        "mx-auto w-full px-4 py-6 sm:px-6 sm:py-8",
        sizeMap[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}
