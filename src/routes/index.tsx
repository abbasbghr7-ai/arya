import { createFileRoute } from "@tanstack/react-router";
import { EndlessRunner } from "@/components/endless-runner";
import "@fontsource/lilita-one/latin-400.css";
import "@fontsource/outfit/latin-500.css";
import "@fontsource/outfit/latin-700.css";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <EndlessRunner />;
}
