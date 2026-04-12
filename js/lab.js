// ══════════════════════════════════════════════════════════
// LAB — Beta Mode (single master toggle)
// ══════════════════════════════════════════════════════════
// Purpose: one button to toggle all experimental features.
// Click LAB → beta mode ON. Click again → beta mode OFF.
//
// Usage in other modules:
//   if (isLab()) { renderBetaUI(); }
//
// All beta features share the single STATE.betaMode flag.
// Persistence: STATE.betaMode synced to Firestore via
// saveToCloud/loadFromCloud in app.js.
// ══════════════════════════════════════════════════════════

// Single master flag. Accepts an optional feature name for
// future per-feature gating, but today all features share
// the same master switch.
const isLab = (feature) => STATE.betaMode === true;
window.isLab = isLab;

const labBadge = () => `<span style="font-size:8px;font-weight:800;letter-spacing:0.1em;padding:2px 6px;border-radius:4px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;margin-left:6px">BETA</span>`;
window.labBadge = labBadge;

// List of features that are gated behind beta mode (for
// messaging only — not for per-feature control).
const BETA_FEATURES_ACTIVE = ['Tags Coloridas em afiliados'];

window.toggleBetaMode = () => {
  STATE.betaMode = !STATE.betaMode;
  const on = STATE.betaMode;

  logAction(`[BETA] Modo Beta ${on ? 'ATIVADO' : 'DESATIVADO'}`,
    on ? `Features: ${BETA_FEATURES_ACTIVE.join(', ')}` : '');
  saveToLocal();
  updateLabButton();

  if (on) {
    toast(`Modo Beta ativado — ${BETA_FEATURES_ACTIVE.join(', ')}`, 's');
  } else {
    toast('Modo Beta desativado', 'i');
  }

  // Re-render current module if it shows beta UI
  const currentMod = document.querySelector('.mod.active')?.id?.replace('mod-', '');
  if (currentMod && ['affiliates', 'dashboard', 'pipeline'].includes(currentMod)) {
    openMod(currentMod);
  }
};

// Update all Lab buttons (hub + mod header) to reflect on/off state
window.updateLabButton = () => {
  const on = STATE.betaMode === true;
  document.querySelectorAll('.hub-lab-btn, .hdr-lab-btn').forEach(btn => {
    if (on) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.setAttribute('title', on
      ? 'Modo Beta ATIVO — clique para desativar'
      : 'Modo Beta — clique para ativar recursos experimentais');
  });
};

// Keep this alias for backwards compat with other modules
window.updateLabDot = window.updateLabButton;
