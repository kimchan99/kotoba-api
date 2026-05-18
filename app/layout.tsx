export const metadata = {
  title: "ことばへんかん API",
  description: "テキスト変換APIサーバー",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
