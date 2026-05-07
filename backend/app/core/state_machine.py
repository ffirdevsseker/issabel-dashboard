"""
State machine geçiş tanımları (kritik #7).

Her durum geçişi: (mevcut_durum, izin_verilen_yeni_durumlar, gerekli_rol).
Kod hiçbir yerde inline `if/else` ile state geçişi yapmamalı.
"""
from typing import Dict, Set, Tuple


class TransitionError(Exception):
    """Geçersiz state geçişi denendiğinde fırlatılır."""


# ── Şikayet ──────────────────────────────────────────────────────────
SIKAYET_TRANSITIONS: Dict[str, Set[Tuple[str, str]]] = {
    # mevcut: { (yeni, gerekli_rol), ... }
    "olusturuldu": {
        ("supervisor_inceleme", "supervizor"),
        ("onaylandi", "supervizor"),
        ("reddedildi", "supervizor"),
    },
    "supervisor_inceleme": {
        ("onaylandi", "supervizor"),
        ("reddedildi", "supervizor"),
    },
    "onaylandi": {
        ("admin_iptali", "admin"),
    },
    "reddedildi": set(),
    "admin_iptali": set(),
}


# ── Vardiya Talebi ───────────────────────────────────────────────────
VARDIYA_TALEP_TRANSITIONS: Dict[str, Set[Tuple[str, str]]] = {
    "gonderildi": {
        ("supervisor_gorus", "supervizor"),
        ("admin_karari", "admin"),  # admin direkt müdahale
        ("iptal", "personel"),       # personel kendi talebini iptal
    },
    "supervisor_gorus": {
        ("admin_karari", "admin"),
        ("admin_karari", "supervizor"),  # supervisor görüş bildirip admin'e yollar
    },
    "admin_karari": {
        ("onaylandi", "admin"),
        ("reddedildi", "admin"),
    },
    "onaylandi": set(),
    "reddedildi": set(),
    "iptal": set(),
}


# ── Mola ─────────────────────────────────────────────────────────────
MOLA_TRANSITIONS: Dict[str, Set[Tuple[str, str]]] = {
    "beklemede": {
        ("onaylandi", "supervizor"),
        ("reddedildi", "supervizor"),
        ("iptal", "personel"),
    },
    "onaylandi": {
        ("tamamlandi", "personel"),
        ("iptal", "supervizor"),
    },
    "reddedildi": set(),
    "tamamlandi": set(),
    "iptal": set(),
}


# ── KB Öneri ─────────────────────────────────────────────────────────
KB_ONERI_TRANSITIONS: Dict[str, Set[Tuple[str, str]]] = {
    "beklemede": {
        ("onaylandi", "supervizor"),
        ("reddedildi", "supervizor"),
    },
    "onaylandi": {
        ("admin_iptali", "admin"),
    },
    "reddedildi": set(),
    "admin_iptali": set(),
}


def assert_transition(
    machine: Dict[str, Set[Tuple[str, str]]],
    current: str,
    target: str,
    role: str,
) -> None:
    """
    Geçiş geçerli değilse TransitionError fırlatır.

    Admin tüm geçişleri yapabilir (override yetkisi) — yine de geçiş tanımlı olmalı.
    """
    allowed = machine.get(current, set())
    if not allowed:
        raise TransitionError(f"'{current}' durumundan başka durum'a geçiş yok")

    # Admin override: hedef state machine'de varsa, rol kontrolünü atla
    valid_targets = {t for t, _ in allowed}
    if target not in valid_targets:
        raise TransitionError(
            f"'{current}' durumundan '{target}' durumuna geçilemez"
        )

    if role == "admin":
        return  # Admin tüm geçerli hedeflere geçiş yapabilir

    valid_for_role = {t for t, r in allowed if r == role}
    if target not in valid_for_role:
        raise TransitionError(
            f"'{role}' rolü '{current}' → '{target}' geçişini yapamaz"
        )
