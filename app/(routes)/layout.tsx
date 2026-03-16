import Header from "@/components/header";
import { Suspense } from "react";

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main>
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <div
        className="overflow-hidden"
      >{children}</div>
    </main>
  );
}
