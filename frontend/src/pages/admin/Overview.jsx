import { useEffect, useState } from "react";
import { Users, Phone, PhoneIncoming, PhoneMissed, Building2, Shield } from "lucide-react";
import { adminApi } from "@/services/api";

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getOverview()
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-slate-500">Veriler yüklenemedi.</div>;
  }

  const kpiCards = [
    {
      label: "Aktif Kullanıcı",
      value: data.system.total_users,
      icon: Users,
      color: "blue",
    },
    {
      label: "Ekip",
      value: data.system.total_teams,
      icon: Shield,
      color: "purple",
    },
    {
      label: "Departman",
      value: data.system.total_departments,
      icon: Building2,
      color: "slate",
    },
    {
      label: "Bugün Toplam Çağrı",
      value: data.today_calls.total,
      icon: Phone,
      color: "emerald",
    },
    {
      label: "Bugün Cevaplanan",
      value: data.today_calls.answered,
      icon: PhoneIncoming,
      color: "green",
    },
    {
      label: "Bugün Cevapsız",
      value: data.today_calls.missed,
      icon: PhoneMissed,
      color: "red",
    },
    {
      label: "Genel Cevaplama Oranı",
      value: `%${data.overall_answer_rate}`,
      icon: Phone,
      color: "teal",
    },
  ];

  const colorMap = {
    blue:    { bg: "bg-blue-50",    icon: "bg-blue-100 text-blue-600",    val: "text-blue-700" },
    purple:  { bg: "bg-purple-50",  icon: "bg-purple-100 text-purple-600",  val: "text-purple-700" },
    slate:   { bg: "bg-slate-50",   icon: "bg-slate-100 text-slate-600",   val: "text-slate-700" },
    emerald: { bg: "bg-emerald-50", icon: "bg-emerald-100 text-emerald-600", val: "text-emerald-700" },
    green:   { bg: "bg-green-50",   icon: "bg-green-100 text-green-600",   val: "text-green-700" },
    red:     { bg: "bg-red-50",     icon: "bg-red-100 text-red-600",       val: "text-red-700" },
    teal:    { bg: "bg-teal-50",    icon: "bg-teal-100 text-teal-600",     val: "text-teal-700" },
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sistem Genel Bakış</h1>
        <p className="text-slate-500 text-sm mt-1">Gerçek zamanlı sistem durumu</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {kpiCards.map((card) => {
          const c = colorMap[card.color];
          const Icon = card.icon;
          return (
            <div key={card.label} className={`rounded-2xl border border-slate-200 ${c.bg} p-4 flex flex-col gap-2`}>
              <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${c.icon}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className={`text-2xl font-extrabold ${c.val}`}>{card.value}</div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{card.label}</div>
            </div>
          );
        })}
      </div>

      {data.recent_audit.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 bg-gradient-to-r from-slate-900 to-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Son İşlemler (Audit Log)</span>
          </div>
          <div className="divide-y divide-slate-100">
            {data.recent_audit.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <span className="text-[12px] font-bold text-slate-700">{log.action}</span>
                  <span className="text-[11px] text-slate-400 ml-2">{log.target}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-slate-500">{log.user}</span>
                  <span className="text-[10px] text-slate-400">
                    {log.olay_zamani ? new Date(log.olay_zamani).toLocaleString("tr-TR") : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
