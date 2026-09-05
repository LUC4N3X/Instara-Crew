import "./globals.css";

export const metadata = {
  title: "Instara Crew - by LUC4N3X",
  applicationName: "Instara Crew",
  description: "Console multi-account per commenti Instagram generati con Gemini",
  authors: [{ name: "LUC4N3X", url: "https://github.com/LUC4N3X" }],
  creator: "LUC4N3X",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
