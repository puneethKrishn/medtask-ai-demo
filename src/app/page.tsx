import dynamic from "next/dynamic";

export const runtime = "edge";

const HomePage = dynamic(() => import("@/components/home-page"), {
  ssr: false,
});

export default function Page() {
  return <HomePage />;
}
