import { redirect } from "next/navigation";

// La pantalla principal vive en el grupo (dashboard)
export default function RootPage() {
  redirect("/dashboard");
}
