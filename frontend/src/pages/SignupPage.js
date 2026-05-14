import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";
import ThemedSelect from "../components/ThemedSelect";

function SignupPage() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "farmer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError(t("signup.passwordShort"));
      return;
    }

    try {
      setLoading(true);
      await signup(form);
      setSuccess(t("signup.success"));
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[82vh] w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid w-full gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <div className="surface-card-highlight p-8 lg:p-10">
          <span className="section-badge">Create Profile</span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-emerald-50">{t("signup.title")}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-emerald-100/78">{t("signup.subtitle")}</p>

          <div className="mt-8 grid gap-4">
            <div className="surface-card-soft p-4">
              <p className="text-sm font-semibold text-lime-200">Farmer access</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">Use the crop, disease, market, and recent predictions modules with simple farmer-friendly inputs.</p>
            </div>
            <div className="surface-card-soft p-4">
              <p className="text-sm font-semibold text-lime-200">Admin access</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70">Monitor performance metrics, model outcomes, and platform-level analytics for project evaluation.</p>
            </div>
          </div>
        </div>

        <section className="surface-card p-8 lg:p-10">
          <div className="max-w-xl">
            <span className="section-badge">Registration</span>
            <h2 className="mt-5 text-3xl font-semibold text-emerald-50">{t("signup.title")}</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100/68">{t("signup.subtitle")}</p>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-emerald-100">{t("signup.name")}</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                required
                className="field-shell"
                placeholder={t("signup.name")}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-emerald-100">{t("signup.email")}</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="field-shell"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-emerald-100">{t("signup.password")}</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                minLength={6}
                className="field-shell"
                placeholder={t("signup.password")}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-emerald-100">{t("signup.role")}</span>
              <ThemedSelect
                value={form.role}
                onChange={(nextRole) => handleChange("role", nextRole)}
                options={[
                  { value: "farmer", label: t("signup.farmer") },
                  { value: "admin", label: t("signup.admin") },
                ]}
              />
            </label>

            {error ? <p className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
            {success ? <p className="rounded-2xl border border-lime-300/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-200">{success}</p> : null}

            <button type="submit" disabled={loading} className="theme-button-primary w-full px-4 py-3 disabled:opacity-70">
              {loading ? t("signup.loading") : t("signup.button")}
            </button>
          </form>

          <p className="mt-6 text-sm text-emerald-100/80">
            {t("signup.already")}{" "}
            <Link to="/login" className="font-semibold text-lime-200 hover:text-lime-100">
              {t("nav.login")}
            </Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default SignupPage;
