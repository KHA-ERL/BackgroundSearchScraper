import { redirect } from "next/navigation";

export default function ActivateRedirectPage() {
  redirect("/dashboard/home");
}
