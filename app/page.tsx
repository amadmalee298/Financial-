import { redirect } from "next/navigation";

// The proxy already sends signed-out users to /login.
export default function Home() {
  redirect("/dashboard");
}
