<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PrivateLLC.us – AI Chat</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    :root {
      --primary: #18a9ff;
      --primary-dark: #0080d6;
      --accent: #111827;
      --bg: #f4f7fb;
      --text-main: #0b1120;
      --text-sub: #4b5563;
      --button-radius: 999px;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
        Roboto, sans-serif;
      background: radial-gradient(circle at top, #e0f3ff 0, #f9fafb 55%, #edf2ff 100%);
      color: var(--text-main);
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page {
      width: 100%;
      max-width: 1100px;
      padding: 2rem 1.5rem 3rem;
    }

    .logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2.5rem;
    }

    .logo-row img {
      height: 64px;
      max-width: 100%;
      object-fit: contain;
    }

    .hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1.75rem;
    }

    .hero-title {
      font-size: clamp(2rem, 4vw, 2.8rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--accent);
    }

    .hero-highlight {
      color: var(--primary);
    }

    .hero-subtitle {
      max-width: 620px;
      font-size: 1rem;
      line-height: 1.6;
      color: var(--text-sub);
    }

    /* Chat button with AI stars */
    .chat-cta-wrapper {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .chat-button {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.9rem 0.9rem;
      border-radius: var(--button-radius);
      border: 1px solid rgba(15, 23, 42, 0.08);
      background: #ffffff;
      box-shadow:
        0 18px 40px rgba(15, 23, 42, 0.16),
        0 0 0 1px rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: transform 0.18s ease, box-shadow 0.18s ease,
        border-color 0.18s ease, background 0.18s ease;
    }

    .chat-button:hover {
      transform: translateY(-2px);
      box-shadow:
        0 22px 55px rgba(15, 23, 42, 0.22),
        0 0 0 1px rgba(255, 255, 255, 0.9);
      border-color: rgba(37, 99, 235, 0.35);
      background: #f9fafb;
    }

    .chat-button-left {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: radial-gradient(circle at 30% 0%, #ffffff 0, #e0f2ff 40%, #bae6fd 100%);
      position: relative;
      overflow: hidden;
    }

    .chat-button-left .sparkle {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: #fbbf24;
      box-shadow:
        0 0 10px rgba(252, 211, 77, 0.9),
        0 0 20px rgba(252, 211, 77, 0.7);
    }

    .sparkle.s1 { top: 6px; left: 6px; }
    .sparkle.s2 { bottom: 7px; right: 8px; width: 6px; height: 6px; }
    .sparkle.s3 { top: 50%; left: 50%; width: 10px; height: 10px; transform: translate(-50%, -50%); }

    .chat-button-text {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .chat-button-label {
      font-size: 0.75rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
    }

    .chat-button-main {
      font-size: 1rem;
      font-weight: 700;
      color: var(--accent);
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .chat-button-main span.badge {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      padding: 0.12rem 0.5rem;
      border-radius: 999px;
      background: #e0f2fe;
      color: #1d4ed8;
      font-weight: 600;
    }

    .chat-button-arrow {
      margin-left: 0.2rem;
      font-size: 1.05rem;
    }

    .trust-text {
      margin-top: 1.2rem;
      font-size: 0.85rem;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .page {
        padding: 1.5rem 1.25rem 2.5rem;
      }
      .logo-row {
        margin-bottom: 1.9rem;
      }
      .chat-button {
        width: 100%;
        justify-content: center;
      }
      .chat-button-text {
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="logo-row">
      <img src="https://i.postimg.cc/VsbrXqDS/privatellcbck-removebg-preview.png" alt="PrivateLLC.us logo">
    </header>

    <section class="hero">
      <h1 class="hero-title">
        Start your <span class="hero-highlight">Private LLC</span> with your compliance assistant.
      </h1>
      <p class="hero-subtitle">
        Welcome, <strong>founder</strong>. I'm here to help you form and protect your LLC and guide you through every step of the process.
      </p>

      <div class="chat-cta-wrapper">
        <button id="ai-chat-button" class="chat-button" type="button">
          <div class="chat-button-left" aria-hidden="true">
            <div class="sparkle s1"></div>
            <div class="sparkle s2"></div>
            <div class="sparkle s3"></div>
          </div>
          <div class="chat-button-text">
            <span class="chat-button-label">Instant help</span>
            <span class="chat-button-main">
              Chat with the PrivateLLC assistant
              <span class="badge">AI</span>
              <span class="chat-button-arrow">→</span>
            </span>
          </div>
        </button>
      </div>

      <p class="trust-text">
        No wait times, no call centers – just fast answers tailored to your LLC needs.
      </p>
    </section>
  </main>

  <!-- Typebot popup widget -->
  <script type="module">
    import Typebot from "https://cdn.jsdelivr.net/npm/@typebot.io/js@0/dist/web.js";

    Typebot.initPopup({
      typebot: "my-typebot",       // replace with your Typebot slug/ID
      autoShowDelay: null,
      theme: {
        chatWindow: {
          backgroundColor: "#ffffff",
          maxWidth: "480px",
          maxHeight: "80vh"
        },
        button: {
          isHidden: true
        }
      }
    });

    document.getElementById("ai-chat-button").addEventListener("click", () => {
      Typebot.open();
    });
  </script>
</body>
</html>
