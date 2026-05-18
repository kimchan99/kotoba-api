export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        color: "#f0ece4",
        fontFamily: "'Helvetica Neue', sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 900,
            letterSpacing: "0.05em",
            background: "linear-gradient(135deg, #ff3860, #ffdd57, #23d160, #38b6ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1rem",
          }}
        >
          ことばへんかん
        </h1>
        <p style={{ color: "#888", fontSize: "1.1rem", marginBottom: "2.5rem" }}>
          どんなサイトのテキストも、ボタンひとつで変換するChrome拡張機能
        </p>
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
            fontSize: "1.5rem",
          }}
        >
          <span title="ギャル語">💅</span>
          <span title="おじさん構文">👴</span>
          <span title="沖縄方言">🌺</span>
          <span title="論文調">🎓</span>
          <span title="小学生用">🧒</span>
        </div>
        <p style={{ color: "#555", fontSize: "0.85rem", marginTop: "2.5rem" }}>
          Chrome拡張機能をインストールして使ってね
        </p>
      </div>
    </div>
  );
}
