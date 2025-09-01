// app/page.tsx
import { redirect } from "next/navigation";

export default function Root() {
  redirect("/fr"); // locale par défaut
}
