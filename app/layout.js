import "./globals.css";

export const metadata = {
  title: "#SoftwareDeveloperPlaylist",
  description: "Code. Compile. Ship. Repeat.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}