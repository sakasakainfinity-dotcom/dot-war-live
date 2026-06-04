import './globals.css';

export const metadata = {
  title: 'Fan War Live HUD',
  description: 'Live A/B fan war overlay HUD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
