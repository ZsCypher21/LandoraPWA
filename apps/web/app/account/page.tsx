import type { Metadata } from "next";
import { PageGuard } from "@/components/PageGuard";
import { PERSONAS } from "@/lib/personas";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage() {
  const { name, email } = PERSONAS.buyer;
  return (
    <PageGuard path="/account" signIn={{ title: "Sign in to see your account", body: "Your account keeps your saved homes, inspection plans and privacy choices." }}>
      <AccountView name={name} email={email} />
    </PageGuard>
  );
}
