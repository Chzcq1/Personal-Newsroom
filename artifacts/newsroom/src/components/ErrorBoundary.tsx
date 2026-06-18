import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    return { hasError: true, message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "32px", marginBottom: "8px" }}>⚠️</p>
          <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            เกิดข้อผิดพลาด
          </p>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "24px", maxWidth: "320px" }}>
            {this.state.message || "Unknown error"}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#1d4ed8",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 24px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            รีโหลดหน้า
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
