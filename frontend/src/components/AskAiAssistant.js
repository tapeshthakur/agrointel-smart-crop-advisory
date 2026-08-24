import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import LoadingSpinner from "./LoadingSpinner";

function AskAiAssistant({ context }) {
  const { language, t, tv } = useLanguage();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: t(
        "ai.welcome",
        "Ask me about your crop recommendation, irrigation, disease result, market support, or next farm steps."
      ),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesListRef = useRef(null);

  const latestCrop = context?.result?.crop || context?.latestCrop || "";
  const quickPrompts = [
    t("ai.quickExplain", "Explain my crop recommendation in simple words."),
    t("ai.quickWeek", "What should I do this week for this crop?"),
    t("ai.quickRisks", "What risks should I watch for in this season?"),
    t("ai.quickLanguage", "Explain this advisory in the selected language."),
  ];
  const contextSummary = useMemo(
    () => [
      { label: t("farmer.state", "State"), value: tv("states", context?.selectedState || "-") },
      { label: t("farmer.season", "Season"), value: tv("seasons", context?.selectedSeason || "-") },
      { label: t("farmer.crop", "Crop"), value: latestCrop ? tv("crops", latestCrop) : "-" },
      {
        label: t("cropCard.confidence", "Confidence"),
        value:
          context?.result?.confidence !== undefined && context?.result?.confidence !== null
            ? `${Number(context.result.confidence <= 1 ? context.result.confidence * 100 : context.result.confidence).toFixed(1)}%`
            : "-",
      },
    ],
    [context, latestCrop, t, tv]
  );

  const sendMessage = async (text) => {
    const question = String(text || input).trim();
    if (!question || loading) return;

    const nextMessages = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");

    try {
      setLoading(true);
      const response = await api.post(
        "/api/ai/chat",
        {
          message: question,
          language,
          context,
          history: nextMessages.slice(-8),
        },
        { timeout: 35000 }
      );
      setMessages((current) => [...current, { role: "assistant", content: response.data.answer }]);
    } catch (err) {
      setError(err.response?.data?.error || t("ai.failed", "AI assistant could not answer right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const list = messagesListRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      list.scrollTo({ top: list.scrollHeight, behavior: "auto" });
    });
  }, [messages, loading]);

  return (
    <section className="surface-card flex min-h-[900px] flex-col p-5 xl:h-[900px]">
      <div className="mb-4 shrink-0 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="section-badge">{t("ai.badge", "Groq Farmer Assistant")}</span>
          <h2 className="mt-3 text-2xl font-semibold text-text-heading">{t("ai.title", "Ask AI")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            {t(
              "ai.subtitle",
              "Ask follow-up questions about the current recommendation. The answer uses your latest crop, irrigation, soil, season, and state context."
            )}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[0.82fr,1.18fr]">
        <aside className="surface-card-soft h-full overflow-visible p-4">
          <p className="text-sm font-semibold text-text-heading">{t("ai.contextTitle", "Current context")}</p>
          <div className="mt-4 grid gap-3">
            {contextSummary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-surface-border bg-surface-card p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-subtle">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-accent-800">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-text-heading">{t("ai.quickTitle", "Quick questions")}</p>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="w-full rounded-2xl border border-surface-border bg-surface-card px-3 py-2.5 text-left text-sm leading-5 text-text-muted transition-all duration-200 hover:border-accent-300 hover:text-accent-800 disabled:opacity-60"
              >
                {prompt}
              </button>
            ))}
          </div>
        </aside>

        <div className="surface-card-soft flex h-full min-h-0 flex-col p-4">
          <div ref={messagesListRef} className="theme-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-2 [overflow-anchor:none]">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div key={`${message.role}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7",
                      isUser
                        ? "bg-accent-500 text-primary-900"
                        : "border border-surface-border bg-surface-card text-text-heading",
                    ].join(" ")}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
            {loading ? (
              <div className="pt-2">
                <LoadingSpinner label={t("ai.thinking", "Thinking with Groq...")} />
              </div>
            ) : null}
          </div>

          {error ? <p className="mt-3 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm text-danger-700">{error}</p> : null}

          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="field-shell"
              placeholder={t("ai.placeholder", "Ask about crop, irrigation, disease, fertilizer, or market guidance...")}
              maxLength={1200}
            />
            <button type="submit" disabled={loading || !input.trim()} className="theme-button-primary px-6 py-3 disabled:opacity-60">
              {t("ai.send", "Send")}
            </button>
          </form>
          <p className="mt-3 text-xs leading-5 text-text-subtle">
            {t(
              "ai.disclaimer",
              "AI guidance is generated from your project data. Confirm chemical, fertilizer, and local decisions with KVK or an agriculture officer."
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default AskAiAssistant;
