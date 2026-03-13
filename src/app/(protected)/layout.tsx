import { AuthProvider } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <div className="relative min-h-screen max-w-sm mx-auto bg-white">
        {children}
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
