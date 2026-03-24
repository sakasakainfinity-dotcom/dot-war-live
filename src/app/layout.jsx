import './globals.css';

export const metadata = {
  title: 'Dot War Live HUD',
  description: 'Live battle overlay HUD',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
