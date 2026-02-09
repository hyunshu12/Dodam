import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Google",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
