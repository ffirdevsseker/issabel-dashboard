import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Phone, ShieldCheck, User } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/logo2.png";

const ROLES = [
  { value: "admin",      label: "Admin",       desc: "Sistem yöneticisi" },
  { value: "supervisor", label: "Supervisor",   desc: "Ekip sorumlusu"   },
  { value: "agent",      label: "Agent",        desc: "Çağrı merkezi temsilcisi" },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState("agent");
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [submitting, setSubmitting]     = useState(false);

  // /auth/me tamamlanıp user set edilince role'e göre yönlendir
  useEffect(() => {
    if (!user) return;
    if (user.role === "admin")           navigate("/admin",      { replace: true });
    else if (user.role === "supervisor") navigate("/supervisor", { replace: true });
    else                                 navigate("/",           { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password, selectedRole);
    } catch (err) {
      setError(err.response?.data?.detail || "Giriş yapılamadı. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f7fafe]">

      {/* ── Sol: Marka paneli ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col"
           style={{ background: "linear-gradient(135deg, #0d1b2a 0%, #132334 45%, #0f2336 100%)" }}>

        {/* Dekoratif halkalar */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full border border-white/[0.04]" />
        <div className="absolute -top-16 -left-16 h-[360px] w-[360px] rounded-full border border-white/[0.06]" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-64 h-[600px] w-[600px] rounded-full border border-white/[0.03]" />
        <div className="absolute top-1/2 -translate-y-1/2 -right-40 h-[400px] w-[400px] rounded-full border border-white/[0.05]" />
        <div className="absolute bottom-0 left-1/4 h-[280px] w-[280px] rounded-full bg-emerald-500/[0.04] blur-3xl" />
        <div className="absolute top-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-blue-500/[0.05] blur-2xl" />

        {/* İçerik */}
        <div className="relative z-10 flex flex-col h-full px-14 py-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-inner">
              <img src={logo} alt="Sporthink" className="h-6 w-6 object-contain" />
            </div>
            <span className="text-white text-[17px] font-bold tracking-wide">Sporthink</span>
          </div>

          {/* Orta metin */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-[0.15em]">
                  Kurumsal IP PBX Paneli
                </span>
              </div>
              <h1 className="text-[38px] font-extrabold text-white leading-tight tracking-tight">
                Çağrı Merkezi<br />
                <span className="text-emerald-400">Yönetim Paneli</span>
              </h1>
              <p className="text-[15px] text-slate-400 leading-relaxed max-w-sm">
                Çağrılarınızı, personelinizi ve performansınızı tek ekrandan gerçek zamanlı izleyin.
              </p>
            </div>

            {/* Feature kartları */}
            <div className="flex flex-col gap-2.5 mt-2">
              {[
                { icon: Phone,  label: "Gerçek Zamanlı Çağrı Takibi",   desc: "AMI ile canlı bağlantı" },
                { icon: User,   label: "Personel Performans Analizi",    desc: "Detaylı CDR raporları"  },
                { icon: Lock,   label: "Rol Tabanlı Erişim Kontrolü",    desc: "Admin & personel rolleri" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.07] px-4 py-3">
                  <div className="h-8 w-8 rounded-lg bg-white/[0.08] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-slate-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/90">{label}</p>
                    <p className="text-[11px] text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} Sporthink. Tüm hakları saklıdır.
          </p>
        </div>
      </div>

      {/* ── Sağ: Form paneli ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">

          {/* Mobilde logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-[#132334] flex items-center justify-center">
              <img src={logo} alt="Sporthink" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-slate-800 text-[16px] font-bold">Sporthink</span>
          </div>

          {/* Form kartı */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_4px_24px_rgba(0,0,0,0.07)] p-8">
            <div className="mb-7">
              <h2 className="text-[24px] font-extrabold text-slate-900 leading-tight">Hoş Geldiniz</h2>
              <p className="text-[13px] text-slate-400 mt-1">Panele erişmek için giriş yapın.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Hata */}
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-3 text-[13px] text-rose-700">
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  {error}
                </div>
              )}

              {/* Rol Seçimi */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-700">
                  Rol
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedRole(value)}
                      disabled={submitting}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-all
                        ${selectedRole === value
                          ? "border-slate-800 bg-slate-900 text-white shadow-md"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                        } disabled:opacity-50`}
                    >
                      <ShieldCheck className={`h-4 w-4 ${selectedRole === value ? "text-emerald-400" : "text-slate-400"}`} />
                      <span className="text-[12px] font-bold leading-none">{label}</span>
                      <span className={`text-[10px] leading-none ${selectedRole === value ? "text-slate-400" : "text-slate-400"}`}>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kullanıcı Adı */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-[13px] font-semibold text-slate-700">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="örn. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 focus:bg-white transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Şifre */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold text-slate-700">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 focus:bg-white transition-all disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !username || !password || !selectedRole}
                className="mt-2 h-11 w-full rounded-xl font-bold text-[14px] text-white transition-all duration-200
                  bg-gradient-to-b from-slate-800 to-slate-900
                  hover:from-slate-700 hover:to-slate-800
                  active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                  shadow-[0_2px_8px_rgba(15,23,42,0.25)]
                  flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5">
            Issabel / Asterisk entegrasyonlu çağrı merkezi yönetim sistemi
          </p>
        </div>
      </div>
    </div>
  );
}
