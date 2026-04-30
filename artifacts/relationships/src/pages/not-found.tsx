import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center p-6">
      <h1 className="text-5xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground mb-6">This page doesn't exist.</p>
      <div className="flex gap-3">
        <Link href="/">
          <Button>Open chatbot</Button>
        </Link>
        <Link href="/admin">
          <Button variant="outline">Manager login</Button>
        </Link>
      </div>
    </div>
  );
}
