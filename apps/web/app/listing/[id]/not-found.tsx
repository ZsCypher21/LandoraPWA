import Link from "next/link";

export default function ListingNotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-bold">This listing isn't available</h1>
      <p className="mt-2 text-muted">It may have sold, been withdrawn, or be waiting on the agent's verification or disclosure documents.</p>
      <Link href="/search" className="btn btn-primary mt-6">
        Back to search
      </Link>
    </div>
  );
}
