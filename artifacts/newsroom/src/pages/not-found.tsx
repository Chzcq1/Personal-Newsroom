import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-5 px-6">
        <div className="flex items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-red-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-lg font-semibold text-foreground">ไม่พบหน้านี้</p>
          <p className="text-sm text-muted-foreground">
            หน้าที่คุณค้นหาอาจถูกย้ายหรือไม่มีอยู่แล้ว
          </p>
        </div>
        <Link to="/">
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            กลับหน้าหลัก
          </button>
        </Link>
      </div>
    </div>
  );
}
