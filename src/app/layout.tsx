import "./globals.css";

export const metadata = {
  title: "Instara Crew",
  description: "Console multi-account per commenti Instagram generati con Gemini",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
